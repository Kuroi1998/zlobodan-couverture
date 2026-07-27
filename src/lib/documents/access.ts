import "server-only";
import type { AuthUser } from "@/lib/auth/permissions";
import { readPrivateObject } from "@/lib/storage/private-object-store";
import { authorizeDocumentAccess, type DocumentAction } from "./authorize";
import {
  findDocumentByPublicId,
  findVersionByNumber,
  findVersionById,
  type DocumentRecord,
  type DocumentVersionRecord,
} from "./repository";

/**
 * Résolution d'un document, de bout en bout : identifiant public → octets.
 *
 * Point de passage **unique** pour la consultation et le téléchargement. Les
 * deux routes appellent cette fonction avec une action différente ; elles ne
 * refont pas le contrôle chacune de leur côté. Deux implémentations parallèles
 * du même contrôle finissent toujours par diverger, et c'est la moins stricte
 * qui reste en production.
 *
 * L'échec est **indifférencié** vers l'appelant : absent, interdit, non
 * publié, tout rend `not-found`. Distinguer 403 et 404 sur un identifiant de
 * document revient à confirmer l'existence du document — et donc à permettre
 * d'énumérer le portefeuille client à coup de substitutions d'URL.
 */

export type DocumentAccessFailure = "not-found" | "unavailable";

export type ResolvedDocument =
  | {
      readonly ok: true;
      readonly document: DocumentRecord;
      readonly version: DocumentVersionRecord;
      readonly bytes: Buffer;
      readonly fileName: string;
    }
  | { readonly ok: false; readonly failure: DocumentAccessFailure };

export interface ResolveDocumentParams {
  readonly publicId: string;
  readonly user: AuthUser;
  readonly action: Extract<DocumentAction, "view" | "download">;
  /**
   * Version demandée. Par défaut, la version courante.
   *
   * Permet à un utilisateur autorisé de retrouver une version antérieure —
   * exactement celle qu'il a reçue — sans jamais pouvoir désigner un fichier
   * appartenant à un autre document : le numéro est résolu **dans** le
   * document déjà autorisé.
   */
  readonly versionNumber?: number;
}

/** Métadonnées d'un document autorisé, sans lire le fichier. */
export interface AuthorizedDocument {
  readonly document: DocumentRecord;
  readonly version: DocumentVersionRecord;
}

export async function authorizeAndLocate(
  params: ResolveDocumentParams
): Promise<
  | { readonly ok: true; readonly located: AuthorizedDocument }
  | { readonly ok: false; readonly failure: DocumentAccessFailure }
> {
  const document = await findDocumentByPublicId(params.publicId);
  if (!document) return { ok: false, failure: "not-found" };

  const verdict = authorizeDocumentAccess(
    { id: params.user.id, role: params.user.role },
    {
      ownerUserId: document.ownerUserId,
      visibility: document.visibility,
      status: document.status,
      assignedToUserId: document.assignedToUserId,
      archivedAt: document.archivedAt,
      deletedAt: document.deletedAt,
    },
    params.action
  );

  if (!verdict.allowed) return { ok: false, failure: "not-found" };

  const version =
    params.versionNumber === undefined
      ? document.currentVersionId
        ? await findVersionById(document.id, document.currentVersionId)
        : null
      : await findVersionByNumber(document.id, params.versionNumber);

  // Une version absente ou non publiée se comporte comme un document absent :
  // rien ne doit laisser deviner qu'une génération est en cours ou a échoué.
  if (!version || version.state !== "ready" || !version.storageKey) {
    return { ok: false, failure: "not-found" };
  }

  return { ok: true, located: { document, version } };
}

export async function resolveDocumentForDelivery(
  params: ResolveDocumentParams
): Promise<ResolvedDocument> {
  const authorized = await authorizeAndLocate(params);
  if (!authorized.ok) return { ok: false, failure: authorized.failure };

  const { document, version } = authorized.located;
  const storageKey = version.storageKey;
  if (!storageKey) return { ok: false, failure: "not-found" };

  try {
    const object = await readPrivateObject(storageKey);
    return {
      ok: true,
      document,
      version,
      bytes: object.bytes,
      // Nom recalculé côté serveur au besoin : la colonne est renseignée à la
      // génération, mais on ne sert jamais un nom nul au navigateur.
      fileName: version.fileName ?? `document-${document.reference}.pdf`,
    };
  } catch {
    // Le stockage est injoignable ou l'objet a disparu. C'est une panne, pas un
    // refus : la distinguer permet de répondre 503 plutôt que 404, et donc de
    // ne pas faire croire à l'utilisateur que son document n'existe plus.
    return { ok: false, failure: "unavailable" };
  }
}
