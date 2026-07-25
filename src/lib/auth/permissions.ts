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

  // Admin : Tous les privilèges
  if (user.role === "admin") return true;

  // Staff : Gestion devis, factures, chantiers, messages, documents
  if (user.role === "staff") {
    if (resourceType === "audit_log" && action === "delete") return false; // Audit append-only
    if (resourceType === "users" && action === "delete") return false; // Seul admin supprime
    return true;
  }

  // Client : Contrôle d'accès strict sur ses propres ressources uniquement
  if (user.role === "client") {
    if (resourceType === "audit_log") return false; // Seul staff/admin consulte l'audit
    if (resourceType === "users" && action === "manage") return false;

    // Contrôle d'appartenance en refus par défaut.
    //
    // La version précédente lisait `ownerId || userId` puis n'appliquait le
    // test que si le résultat était vérité : une ressource orpheline, ou un
    // objet partiellement chargé, franchissait donc le contrôle (audit F1).
    // Ici, fournir une ressource sans propriétaire identifiable est un refus.
    if (resourceObject) {
      const resourceOwnerId = resourceObject.ownerId ?? resourceObject.userId ?? null;
      if (!resourceOwnerId) {
        return false; // Propriétaire inconnu : on ne devine pas, on refuse.
      }
      if (resourceOwnerId !== user.id) {
        return false; // Bloque l'accès croisé Client A vs Client B.
      }
    }

    if (action === "read" || action === "download" || action === "accept" || action === "refuse" || action === "create") {
      return true;
    }
  }

  return false;
}
