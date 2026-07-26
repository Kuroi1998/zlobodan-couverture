import type { UserRole } from "@/lib/auth/permissions";
import { safeReturnPath } from "@/lib/security/urls";

export const DEFAULT_CLIENT_DESTINATION = "/mon-compte";
export const DEFAULT_ADMIN_DESTINATION = "/admin";

function isPathInside(path: string, root: string): boolean {
  const pathname = path.split(/[?#]/, 1)[0];
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isUserRole(value: unknown): value is UserRole {
  return value === "client" || value === "staff" || value === "admin";
}

export function getDefaultDestination(role: UserRole): string {
  return role === "admin" || role === "staff"
    ? DEFAULT_ADMIN_DESTINATION
    : DEFAULT_CLIENT_DESTINATION;
}

/**
 * Calcule la destination après authentification depuis une source de rôle
 * serveur. Le chemin demandé est d'abord limité au site courant, puis soumis
 * au contrôle vertical minimal : un client ne peut jamais choisir `/admin`
 * comme destination, même en forgeant lui-même le paramètre `next`.
 */
export function getPostLoginDestination(
  role: UserRole,
  requestedPath: unknown
): string {
  const fallback = getDefaultDestination(role);
  const destination = safeReturnPath(requestedPath, fallback);

  if (role === "client" && isPathInside(destination, DEFAULT_ADMIN_DESTINATION)) {
    return fallback;
  }

  return destination;
}

/**
 * Convention unique pour les gardes de pages : `next` contient uniquement un
 * chemin interne encodé, jamais une origine complète.
 */
export function getLoginRedirectPath(requestedPath?: unknown): string {
  const safePath = safeReturnPath(requestedPath, "");
  if (!safePath) return "/connexion";

  const params = new URLSearchParams({ next: safePath });
  return `/connexion?${params.toString()}`;
}
