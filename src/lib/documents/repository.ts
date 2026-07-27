import "server-only";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { documents, documentVersions } from "@/db/schema/documents";
import type {
  DocumentStatus,
  DocumentType,
  DocumentVisibility,
} from "@/db/schema/documents";
import { quoteRequests } from "@/db/schema/quotes";

/**
 * Accès PostgreSQL aux documents.
 *
 * Chaque lecture rapporte systématiquement ce qui permet de trancher
 * l'autorisation — propriétaire, visibilité, statut, opérateur affecté — pour
 * la même raison que `repositories/billing.ts` : une requête qui ne ramène pas
 * son propriétaire invite l'appelant à oublier le contrôle d'accès.
 *
 * Les jointures passent par `quote_requests` pour récupérer l'affectation, qui
 * vit sur la demande et non sur le document.
 */

export interface DocumentRecord {
  readonly id: string;
  readonly publicId: string;
  readonly reference: string;
  readonly documentType: DocumentType;
  readonly title: string;
  readonly status: DocumentStatus;
  readonly visibility: DocumentVisibility;
  readonly ownerUserId: string;
  readonly quoteRequestId: string | null;
  readonly assignedToUserId: string | null;
  readonly requestReference: string | null;
  readonly currentVersionId: string | null;
  readonly archivedAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface DocumentVersionRecord {
  readonly id: string;
  readonly documentId: string;
  readonly versionNumber: number;
  readonly state: "pending" | "ready" | "failed";
  readonly storageKey: string | null;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly checksumAlgorithm: string | null;
  readonly checksumValue: string | null;
  readonly sourceFingerprint: string | null;
  readonly createdAt: Date;
  readonly supersededAt: Date | null;
}

const DOCUMENT_COLUMNS = {
  id: documents.id,
  publicId: documents.publicId,
  reference: documents.reference,
  documentType: documents.documentType,
  title: documents.title,
  status: documents.status,
  visibility: documents.visibility,
  ownerUserId: documents.ownerUserId,
  quoteRequestId: documents.quoteRequestId,
  assignedToUserId: quoteRequests.assignedToUserId,
  requestReference: quoteRequests.reference,
  currentVersionId: documents.currentVersionId,
  archivedAt: documents.archivedAt,
  deletedAt: documents.deletedAt,
  createdAt: documents.createdAt,
  updatedAt: documents.updatedAt,
} as const;

const VERSION_COLUMNS = {
  id: documentVersions.id,
  documentId: documentVersions.documentId,
  versionNumber: documentVersions.versionNumber,
  state: documentVersions.state,
  storageKey: documentVersions.storageKey,
  fileName: documentVersions.fileName,
  mimeType: documentVersions.mimeType,
  sizeBytes: documentVersions.sizeBytes,
  checksumAlgorithm: documentVersions.checksumAlgorithm,
  checksumValue: documentVersions.checksumValue,
  sourceFingerprint: documentVersions.sourceFingerprint,
  createdAt: documentVersions.createdAt,
  supersededAt: documentVersions.supersededAt,
} as const;

/**
 * Recherche par identifiant public.
 *
 * La suppression logique est filtrée ici plutôt que laissée à l'appelant :
 * oublier `deleted_at` sur une seule route suffirait à ressusciter un document
 * retiré.
 */
export async function findDocumentByPublicId(
  publicId: string
): Promise<DocumentRecord | null> {
  const rows = await db
    .select(DOCUMENT_COLUMNS)
    .from(documents)
    .leftJoin(quoteRequests, eq(documents.quoteRequestId, quoteRequests.id))
    .where(and(eq(documents.publicId, publicId), isNull(documents.deletedAt)))
    .limit(1);

  return rows[0] ?? null;
}

export async function findVersionById(
  documentId: string,
  versionId: string
): Promise<DocumentVersionRecord | null> {
  const rows = await db
    .select(VERSION_COLUMNS)
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.id, versionId),
        // L'identifiant de version est comparé **avec** celui du document :
        // sans cela, une version valide d'un autre dossier serait servie sur
        // simple substitution dans l'URL.
        eq(documentVersions.documentId, documentId)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function findVersionByNumber(
  documentId: string,
  versionNumber: number
): Promise<DocumentVersionRecord | null> {
  const rows = await db
    .select(VERSION_COLUMNS)
    .from(documentVersions)
    .where(
      and(
        eq(documentVersions.documentId, documentId),
        eq(documentVersions.versionNumber, versionNumber)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export async function listVersions(
  documentId: string
): Promise<DocumentVersionRecord[]> {
  return db
    .select(VERSION_COLUMNS)
    .from(documentVersions)
    .where(eq(documentVersions.documentId, documentId))
    .orderBy(desc(documentVersions.versionNumber));
}

/** Document récapitulatif déjà émis pour une demande, s'il existe. */
export async function findSummaryDocumentForRequest(
  quoteRequestId: string,
  documentType: DocumentType
): Promise<DocumentRecord | null> {
  const rows = await db
    .select(DOCUMENT_COLUMNS)
    .from(documents)
    .leftJoin(quoteRequests, eq(documents.quoteRequestId, quoteRequests.id))
    .where(
      and(
        eq(documents.quoteRequestId, quoteRequestId),
        eq(documents.documentType, documentType),
        isNull(documents.deletedAt)
      )
    )
    .limit(1);

  return rows[0] ?? null;
}

export interface OwnedDocumentListItem extends DocumentRecord {
  readonly versionNumber: number | null;
  readonly sizeBytes: number | null;
  readonly fileName: string | null;
}

/**
 * Documents d'un client, page par page.
 *
 * La propriété entre dans la clause `where`, elle n'est pas vérifiée après
 * coup : charger puis filtrer laisse une fenêtre où le mauvais document est
 * déjà en mémoire, et souvent déjà journalisé.
 *
 * Les documents sans version prête sont exclus : tant que le fichier n'est pas
 * écrit, le document n'existe pas du point de vue du client.
 */
export async function listDocumentsForOwner(params: {
  ownerUserId: string;
  page: number;
  pageSize: number;
}): Promise<{ items: OwnedDocumentListItem[]; total: number }> {
  const visibleToClient = and(
    eq(documents.ownerUserId, params.ownerUserId),
    isNull(documents.deletedAt),
    isNull(documents.archivedAt),
    sql`${documents.visibility} in ('client','client_and_staff')`,
    sql`${documents.status} in ('generated','sent')`,
    eq(documentVersions.state, "ready")
  );

  const items = await db
    .select({
      ...DOCUMENT_COLUMNS,
      versionNumber: documentVersions.versionNumber,
      sizeBytes: documentVersions.sizeBytes,
      fileName: documentVersions.fileName,
    })
    .from(documents)
    .innerJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id)
    )
    .leftJoin(quoteRequests, eq(documents.quoteRequestId, quoteRequests.id))
    .where(visibleToClient)
    .orderBy(desc(documents.createdAt))
    .limit(params.pageSize)
    .offset((params.page - 1) * params.pageSize);

  const totals = await db
    .select({ value: sql<number>`count(*)::int` })
    .from(documents)
    .innerJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id)
    )
    .where(visibleToClient);

  return { items, total: Number(totals[0]?.value ?? 0) };
}

/** Documents rattachés à une demande, pour l'écran d'administration. */
export async function listDocumentsForRequest(
  quoteRequestId: string
): Promise<OwnedDocumentListItem[]> {
  return db
    .select({
      ...DOCUMENT_COLUMNS,
      versionNumber: documentVersions.versionNumber,
      sizeBytes: documentVersions.sizeBytes,
      fileName: documentVersions.fileName,
    })
    .from(documents)
    .leftJoin(
      documentVersions,
      eq(documents.currentVersionId, documentVersions.id)
    )
    .leftJoin(quoteRequests, eq(documents.quoteRequestId, quoteRequests.id))
    .where(
      and(
        eq(documents.quoteRequestId, quoteRequestId),
        isNull(documents.deletedAt)
      )
    )
    .orderBy(desc(documents.createdAt));
}
