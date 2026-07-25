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

function canStaff(action: ActionType, resourceType: ResourceType): boolean {
  if (resourceType === "audit_log" && action === "delete") return false;
  if (resourceType === "users" && action === "delete") return false;
  return true;
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
