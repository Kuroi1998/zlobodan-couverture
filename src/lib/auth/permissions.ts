export type UserRole = "client" | "staff" | "admin";

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  emailVerifiedAt?: Date | null;
}

export type ResourceType =
  | "quote"
  | "invoice"
  | "project"
  | "document"
  | "message"
  | "audit_log"
  | "users";

export type ActionType =
  | "read"
  | "create"
  | "update"
  | "delete"
  | "accept"
  | "refuse"
  | "download"
  | "manage";

export interface ResourceOwnership {
  ownerId?: string | null;
  userId?: string | null;
}

const CLIENT_ALLOWED_ACTIONS: ReadonlySet<ActionType> = new Set<ActionType>([
  "read",
  "download",
  "accept",
  "refuse",
  "create",
]);

/**
 * Ressources sur lesquelles un opérateur travaille réellement.
 *
 * Liste blanche et non liste noire : la version précédente accordait tout à
 * `staff` sauf deux suppressions, ce qui lui donnait `manage` sur `users` —
 * donc, en droit, la capacité d'élever un rôle. Aucun écran ne l'exposait,
 * mais une permission qui n'existe que par oubli finit par être utilisée le
 * jour où l'écran arrive.
 *
 * Ajouter une ressource sans l'inscrire ici la rend inaccessible au staff,
 * ce qui est le bon sens d'échec.
 */
const STAFF_RESOURCES: ReadonlySet<ResourceType> = new Set<ResourceType>([
  "quote",
  "invoice",
  "project",
  "document",
  "message",
]);

function canStaff(action: ActionType, resourceType: ResourceType): boolean {
  // Comptes utilisateurs et journal d'audit : réservés à `admin`. Le journal
  // expose l'activité de tous les opérateurs et des empreintes d'IP ; la
  // gestion des comptes est l'opération la plus sensible du système.
  if (!STAFF_RESOURCES.has(resourceType)) return false;

  // Une suppression définitive relève de l'administration, même sur un
  // dossier : l'archivage passe par une transition de statut, pas par un
  // `delete`.
  return action !== "delete";
}

function canClient(
  action: ActionType,
  resourceType: ResourceType,
  user: AuthUser,
  resourceObject?: ResourceOwnership
): boolean {
  if (resourceType === "audit_log") return false;
  if (resourceType === "users" && action === "manage") return false;

  if (resourceObject) {
    const resourceOwnerId = resourceObject.ownerId ?? resourceObject.userId ?? null;
    if (!resourceOwnerId || resourceOwnerId !== user.id) {
      return false;
    }
  }

  return CLIENT_ALLOWED_ACTIONS.has(action);
}

/**
 * Fonction d'autorisation unifiée centralisée CAN(user, action, resource)
 * Vérifie systématiquement les permissions côté serveur.
 */
export function can(
  user: AuthUser | null | undefined,
  action: ActionType,
  resourceType: ResourceType,
  resourceObject?: ResourceOwnership
): boolean {
  if (!user) return false;

  switch (user.role) {
    case "admin":
      return true;
    case "staff":
      return canStaff(action, resourceType);
    case "client":
      return canClient(action, resourceType, user, resourceObject);
    default:
      return false;
  }
}
