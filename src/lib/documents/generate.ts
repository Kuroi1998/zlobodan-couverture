import "server-only";
import crypto from "node:crypto";
import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, documentVersions } from "@/db/schema/documents";
import type { DocumentVisibility } from "@/db/schema/documents";
import { reservePublicReference } from "@/lib/db/public-references";
import { putPrivateObject } from "@/lib/storage/private-object-store";
import { renderQuoteRequestSummary } from "@/lib/pdf/templates/quote-request-summary";
import { logAuditEvent } from "@/lib/services/audit-service";
import { loadQuoteRequestSource } from "./quote-request-source";
import { buildDocumentFileName, buildDocumentTitle, buildStorageKey } from "./naming";
import {
  findSummaryDocumentForRequest,
  findVersionById,
  type DocumentRecord,
} from "./repository";

/**
 * Fabrication du récapitulatif de demande.
 *
 * L'ordre des opérations est la partie importante de ce module. Il est dicté
 * par une question : que reste-t-il en base si le processus meurt ici ?
 *
 *   1. transaction — document (créé au besoin) et **ligne de version en
 *      `pending`, clé de stockage déjà inscrite** ;
 *   2. hors transaction — rendu du PDF puis écriture dans le stockage privé ;
 *   3. transaction — passage en `ready`, calcul de l'empreinte, bascule de
 *      `current_version_id`, péremption de la version précédente.
 *
 * Écrire la ligne *avant* le fichier peut sembler contre-intuitif. C'est
 * pourtant le seul ordre qui ne produit jamais de fichier inconnu de la base :
 * une interruption laisse une version `pending` dont la clé est connue, donc
 * réconciliable et nettoyable. L'ordre inverse — fichier d'abord — laisserait
 * un objet orphelin dans le stockage, que plus rien ne référence.
 *
 * Le client, lui, ne voit rien tant que la version n'est pas `ready` : les
 * listes filtrent sur cet état, et la base refuse `ready` sans fichier ni
 * empreinte.
 */

export type GenerationFailure =
  | "request-not-found"
  | "no-owner"
  | "render-failed"
  | "storage-failed"
  /** Fichier écrit, publication en base impossible : orphelin à réconcilier. */
  | "publish-failed";

export class DocumentGenerationError extends Error {
  readonly failure: GenerationFailure;

  constructor(failure: GenerationFailure, message: string) {
    super(message);
    this.name = "DocumentGenerationError";
    this.failure = failure;
  }
}

export interface GenerateSummaryParams {
  readonly quoteRequestId: string;
  readonly actorUserId: string;
  /**
   * Force une nouvelle version même si les données sources n'ont pas changé.
   *
   * Sans ce drapeau, la génération est idempotente : rejouer l'action rend la
   * version existante au lieu d'empiler des fichiers identiques.
   */
  readonly force?: boolean;
  readonly visibility?: DocumentVisibility;
}

export interface GenerateSummaryResult {
  readonly publicId: string;
  readonly reference: string;
  readonly versionNumber: number;
  readonly checksum: string;
  readonly sizeBytes: number;
  /** Vrai lorsqu'une version existante a été réutilisée. */
  readonly reused: boolean;
}

const DOCUMENT_TYPE = "quote_request_summary" as const;
const MIME_TYPE = "application/pdf";
const CHECKSUM_ALGORITHM = "sha256";

/**
 * Réutilisation possible ?
 *
 * Oui si la version courante est prête et que l'empreinte des données sources
 * n'a pas bougé. L'empreinte porte sur ce qui est réellement imprimé, pas sur
 * `updated_at` : une écriture sans effet sur le document ne doit pas provoquer
 * de nouvelle version.
 */
async function findReusableVersion(
  document: DocumentRecord,
  fingerprint: string
): Promise<{ versionNumber: number; checksum: string; sizeBytes: number } | null> {
  if (!document.currentVersionId) return null;

  const current = await findVersionById(document.id, document.currentVersionId);
  if (
    !current ||
    current.state !== "ready" ||
    current.sourceFingerprint !== fingerprint ||
    !current.checksumValue ||
    current.sizeBytes === null
  ) {
    return null;
  }

  return {
    versionNumber: current.versionNumber,
    checksum: current.checksumValue,
    sizeBytes: current.sizeBytes,
  };
}

export async function generateQuoteRequestSummary(
  params: GenerateSummaryParams
): Promise<GenerateSummaryResult> {
  const source = await loadQuoteRequestSource(params.quoteRequestId);
  if (!source) {
    throw new DocumentGenerationError(
      "request-not-found",
      "Demande introuvable."
    );
  }

  // Un document doit avoir un titulaire. Une demande déposée sans compte n'en
  // a pas : inventer un propriétaire rendrait le document accessible au mauvais
  // espace client, ou à aucun.
  if (!source.ownerUserId) {
    throw new DocumentGenerationError(
      "no-owner",
      "La demande n'est rattachée à aucun compte client."
    );
  }
  const ownerUserId = source.ownerUserId;

  const existing = await findSummaryDocumentForRequest(
    params.quoteRequestId,
    DOCUMENT_TYPE
  );

  if (existing && !params.force) {
    const reusable = await findReusableVersion(existing, source.fingerprint);
    if (reusable) {
      return {
        publicId: existing.publicId,
        reference: existing.reference,
        versionNumber: reusable.versionNumber,
        checksum: reusable.checksum,
        sizeBytes: reusable.sizeBytes,
        reused: true,
      };
    }
  }

  const now = new Date();

  // --- Étape 1 : réservation en base ---------------------------------------
  const reserved = await db.transaction(async (transaction) => {
    let documentId = existing?.id;
    let publicId = existing?.publicId;
    let reference = existing?.reference;

    if (!documentId) {
      const documentReference = await reservePublicReference(
        transaction,
        "document",
        now
      );
      const inserted = await transaction
        .insert(documents)
        .values({
          reference: documentReference,
          ownerUserId,
          createdByUserId: params.actorUserId,
          quoteRequestId: params.quoteRequestId,
          documentType: DOCUMENT_TYPE,
          title: buildDocumentTitle(DOCUMENT_TYPE, source.reference),
          status: "generated",
          visibility: params.visibility ?? "client_and_staff",
          createdAt: now,
          updatedAt: now,
        })
        .returning({
          id: documents.id,
          publicId: documents.publicId,
          reference: documents.reference,
        });

      const row = inserted[0];
      if (!row) throw new Error("Création du document sans retour de ligne.");
      documentId = row.id;
      publicId = row.publicId;
      reference = row.reference;
    }

    // Numéro de version suivant, calculé dans la transaction. L'index unique
    // (document_id, version_number) reste le garde-fou en cas de concurrence :
    // la seconde transaction échoue au lieu de dupliquer un numéro.
    const maxRows = await transaction
      .select({
        value: sql<number>`coalesce(max(${documentVersions.versionNumber}), 0)::int`,
      })
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));

    const versionNumber = Number(maxRows[0]?.value ?? 0) + 1;
    const storageKey = buildStorageKey(
      DOCUMENT_TYPE,
      documentId,
      versionNumber,
      now.getUTCFullYear()
    );

    const versionRows = await transaction
      .insert(documentVersions)
      .values({
        documentId,
        versionNumber,
        state: "pending",
        storageKey,
        fileName: buildDocumentFileName(
          DOCUMENT_TYPE,
          reference ?? "document",
          versionNumber
        ),
        mimeType: MIME_TYPE,
        sourceFingerprint: source.fingerprint,
        generatedByUserId: params.actorUserId,
        createdAt: now,
      })
      .returning({ id: documentVersions.id });

    const versionId = versionRows[0]?.id;
    if (!versionId) throw new Error("Création de version sans retour de ligne.");

    return {
      documentId,
      publicId: publicId ?? "",
      reference: reference ?? "",
      versionId,
      versionNumber,
      storageKey,
    };
  });

  /**
   * Inscrit l'échec puis le remonte typé.
   *
   * L'échec est enregistré, jamais avalé : une version `failed` laisse une
   * trace exploitable et empêche le document d'apparaître comme disponible.
   */
  const failAndThrow = async (
    failure: GenerationFailure
  ): Promise<never> => {
    await db
      .update(documentVersions)
      .set({ state: "failed", failureReason: failure })
      .where(eq(documentVersions.id, reserved.versionId));

    await logAuditEvent({
      userId: params.actorUserId,
      action: "document.generation_failed",
      targetTable: "documents",
      targetId: reserved.documentId,
      diff: {
        reference: reserved.reference,
        version: reserved.versionNumber,
        failure,
      },
    });

    throw new DocumentGenerationError(
      failure,
      "La génération du document a échoué."
    );
  };

  // --- Étape 2 : rendu, puis stockage --------------------------------------
  //
  // Les deux opérations sont gardées séparément. Les confondre obligerait à
  // deviner l'origine de la panne d'après le message de l'exception, ce qui
  // cesse de fonctionner dès qu'une dépendance reformule ses erreurs.
  let buffer: Buffer;
  let checksum: string;

  try {
    const bytes = await renderQuoteRequestSummary({
      ...source.base,
      documentReference: reserved.reference,
      versionNumber: reserved.versionNumber,
      generatedAt: now,
    });
    buffer = Buffer.from(bytes);
    checksum = crypto
      .createHash(CHECKSUM_ALGORITHM)
      .update(buffer)
      .digest("hex");
  } catch {
    return failAndThrow("render-failed");
  }

  try {
    await putPrivateObject(reserved.storageKey, buffer, MIME_TYPE);
  } catch {
    return failAndThrow("storage-failed");
  }

  try {
    // --- Étape 3 : publication ---------------------------------------------
    await db.transaction(async (transaction) => {
      await transaction
        .update(documentVersions)
        .set({
          state: "ready",
          sizeBytes: buffer.length,
          checksumAlgorithm: CHECKSUM_ALGORITHM,
          checksumValue: checksum,
        })
        .where(eq(documentVersions.id, reserved.versionId));

      // Péremption des versions antérieures. Elles restent stockées et
      // consultables : c'est tout l'intérêt du versionnement. Seul leur statut
      // de « version courante » change.
      await transaction
        .update(documentVersions)
        .set({ supersededAt: now })
        .where(
          and(
            eq(documentVersions.documentId, reserved.documentId),
            isNull(documentVersions.supersededAt),
            sql`${documentVersions.id} <> ${reserved.versionId}`
          )
        );

      await transaction
        .update(documents)
        .set({ currentVersionId: reserved.versionId, updatedAt: now })
        .where(eq(documents.id, reserved.documentId));
    });

    await logAuditEvent({
      userId: params.actorUserId,
      action: "document.generated",
      targetTable: "documents",
      targetId: reserved.documentId,
      // Ni le contenu, ni la clé de stockage : l'empreinte suffit à prouver
      // quelle version a été produite.
      diff: {
        reference: reserved.reference,
        version: reserved.versionNumber,
        checksum,
        bytes: buffer.length,
      },
    });

    return {
      publicId: reserved.publicId,
      reference: reserved.reference,
      versionNumber: reserved.versionNumber,
      checksum,
      sizeBytes: buffer.length,
      reused: false,
    };
  } catch {
    // Cas le plus délicat : le fichier **est** écrit, mais la base n'a pas pu
    // acter sa publication. La version est marquée `failed` avec sa clé de
    // stockage déjà inscrite, ce qui rend l'objet identifiable et supprimable
    // par le nettoyage différé. Sans cette trace, le fichier serait orphelin :
    // présent dans le stockage, référencé nulle part.
    return failAndThrow("publish-failed");
  }
}
