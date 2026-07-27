import type { UserRole } from "@/lib/auth/permissions";
import type { DocumentStatus, DocumentVisibility } from "@/db/schema/documents";

/**
 * Autorisation d'accès aux documents.
 *
 * Fonction **pure** : elle ne lit ni session, ni base, ni requête. L'appelant
 * lui remet un sujet et une cible déjà chargés depuis PostgreSQL, elle rend un
 * verdict. Ce choix la rend exhaustivement testable — chaque combinaison de
 * rôle, de visibilité et de statut est vérifiable sans base ni serveur, et
 * c'est précisément ce qu'on veut pouvoir prouver.
 *
 * Elle complète `lib/auth/permissions.can()` sans la remplacer. `can()` répond
 * « ce rôle a-t-il le droit de manipuler des documents en général ». Elle est
 * volontairement large : elle accorde à `staff` toutes les actions sur la
 * ressource `document`. Ici on tranche la question réellement dangereuse :
 * « **ce** document, pour **cet** utilisateur ». Sans cette seconde couche, un
 * opérateur affecté à un seul dossier accéderait à tous les documents de tous
 * les clients — l'exact contraire du moindre privilège.
 *
 * Le verdict porte un motif. Il alimente le journal d'audit ; il ne doit
 * **jamais** être renvoyé au navigateur, sous peine d'indiquer à un curieux
 * pourquoi son essai a échoué, donc que la ressource existe.
 */

export type DocumentAction = "view" | "download" | "generate" | "archive";

export type DocumentDenialReason =
  | "deleted"
  | "cancelled"
  | "not-owner"
  | "visibility"
  | "not-assigned"
  | "archived"
  | "role"
  | "action";

export interface DocumentAccessSubject {
  readonly id: string;
  readonly role: UserRole;
}

export interface DocumentAccessTarget {
  readonly ownerUserId: string;
  readonly visibility: DocumentVisibility;
  readonly status: DocumentStatus;
  /** Opérateur affecté à la demande d'origine, s'il y en a un. */
  readonly assignedToUserId: string | null;
  readonly archivedAt: Date | null;
  readonly deletedAt: Date | null;
}

export type DocumentAccessVerdict =
  | { readonly allowed: true }
  | { readonly allowed: false; readonly reason: DocumentDenialReason };

const ALLOW: DocumentAccessVerdict = { allowed: true };

function deny(reason: DocumentDenialReason): DocumentAccessVerdict {
  return { allowed: false, reason };
}

/** Visibilités qui incluent le client propriétaire. */
const CLIENT_VISIBILITIES: ReadonlySet<DocumentVisibility> = new Set<DocumentVisibility>([
  "client",
  "client_and_staff",
]);

/** Visibilités qui incluent l'opérateur affecté au dossier. */
const STAFF_VISIBILITIES: ReadonlySet<DocumentVisibility> = new Set<DocumentVisibility>([
  "assigned_staff",
  "client_and_staff",
]);

function authorizeClient(
  subject: DocumentAccessSubject,
  target: DocumentAccessTarget,
  action: DocumentAction
): DocumentAccessVerdict {
  // Un client ne fabrique ni n'archive : ces actions relèvent de l'entreprise.
  if (action !== "view" && action !== "download") return deny("action");

  // Propriété d'abord. C'est le contrôle qui ferme l'accès horizontal, et il
  // porte sur la colonne `owner_user_id` relue en base — jamais sur un
  // identifiant transmis par le navigateur.
  if (target.ownerUserId !== subject.id) return deny("not-owner");

  if (!CLIENT_VISIBILITIES.has(target.visibility)) return deny("visibility");

  // Un document archivé sort des écrans du client mais reste consultable par
  // l'entreprise : l'archivage est un classement, pas une suppression.
  if (target.archivedAt !== null || target.status === "archived") {
    return deny("archived");
  }

  return ALLOW;
}

function authorizeStaff(
  subject: DocumentAccessSubject,
  target: DocumentAccessTarget,
  action: DocumentAction
): DocumentAccessVerdict {
  // L'archivage engage le classement d'un document d'entreprise : réservé à
  // l'administration, comme la suppression.
  if (action === "archive") return deny("role");

  if (!STAFF_VISIBILITIES.has(target.visibility)) return deny("visibility");

  // Cœur du moindre privilège : être opérateur ne suffit pas, il faut être
  // l'opérateur **de ce dossier**. Sans cette condition, toute personne du
  // pôle accéderait à l'intégralité du portefeuille client.
  if (
    target.assignedToUserId === null ||
    target.assignedToUserId !== subject.id
  ) {
    return deny("not-assigned");
  }

  return ALLOW;
}

export function authorizeDocumentAccess(
  subject: DocumentAccessSubject | null | undefined,
  target: DocumentAccessTarget,
  action: DocumentAction
): DocumentAccessVerdict {
  if (!subject) return deny("role");

  // Un document supprimé logiquement n'est plus servi à personne. Sa ligne
  // survit pour l'intégrité référentielle et le journal, pas pour la lecture.
  if (target.deletedAt !== null) return deny("deleted");

  // Un document annulé n'a plus de valeur : il ne se télécharge pas, quel que
  // soit le rôle. L'administration le voit encore dans l'historique.
  if (target.status === "cancelled" && action !== "view") {
    return deny("cancelled");
  }

  switch (subject.role) {
    case "admin":
      // L'administration accède à tout ce qui n'est pas supprimé, y compris
      // aux documents archivés et aux versions antérieures : c'est le rôle qui
      // répond des dossiers dans la durée.
      return ALLOW;
    case "staff":
      return authorizeStaff(subject, target, action);
    case "client":
      return authorizeClient(subject, target, action);
    default:
      return deny("role");
  }
}
