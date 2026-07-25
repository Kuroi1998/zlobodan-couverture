import { redirect } from "next/navigation";
import { NextResponse } from "next/server";
import {
  can,
  type ActionType,
  type AuthUser,
  type ResourceOwnership,
  type ResourceType,
  type UserRole,
} from "@/lib/auth/permissions";
import { resolveSession } from "./session-guard";
import { recordSecurityEvent } from "./security-events";

/**
 * Gardes d'accès serveur.
 *
 * Ces contrôles vivent délibérément dans les layouts et les handlers, et non
 * dans `middleware.ts` : CVE-2025-29927 permet de neutraliser l'exécution du
 * middleware Next.js via un en-tête forgé (audit C7). Le middleware reste un
 * filet secondaire, jamais la seule barrière.
 */

const LOGIN_PATH = "/connexion";

function loginRedirect(nextPath?: string): never {
  const target = nextPath
    ? `${LOGIN_PATH}?next=${encodeURIComponent(nextPath)}`
    : LOGIN_PATH;
  redirect(target);
}

/** Réponse d'API volontairement uniforme : elle ne distingue pas « absent » de « interdit ». */
function denyJson(status: 401 | 403 | 404): NextResponse {
  const body =
    status === 401
      ? { success: false, error: "Authentification requise." }
      : status === 403
        ? { success: false, error: "Accès refusé." }
        : { success: false, error: "Ressource introuvable." };
  return NextResponse.json(body, { status });
}

// ---------------------------------------------------------------------------
// Pages (composants serveur)
// ---------------------------------------------------------------------------

export async function requirePageAuth(currentPath?: string): Promise<AuthUser> {
  const { user, reason } = await resolveSession();
  if (!user) {
    if (reason && reason !== "no-token") {
      await recordSecurityEvent({
        kind: "ACCESS_DENIED_UNAUTHENTICATED",
        severity: "medium",
        route: currentPath ?? null,
        detail: { reason },
      });
    }
    loginRedirect(currentPath);
  }
  return user;
}

export async function requirePageRole(
  allowed: readonly UserRole[],
  currentPath?: string
): Promise<AuthUser> {
  const user = await requirePageAuth(currentPath);
  if (!allowed.includes(user.role)) {
    await recordSecurityEvent({
      kind: "ACCESS_DENIED_ROLE",
      severity: "high",
      userId: user.id,
      route: currentPath ?? null,
      detail: { held: user.role, required: allowed },
    });
    // Élévation verticale refusée : on renvoie vers l'espace du rôle réel
    // plutôt que d'exposer l'existence de la zone demandée.
    redirect("/mon-compte");
  }
  return user;
}

// ---------------------------------------------------------------------------
// Routes API
// ---------------------------------------------------------------------------

export type ApiGuardResult<T> = { ok: true; user: T } | { ok: false; response: NextResponse };

export async function requireApiUser(route: string): Promise<ApiGuardResult<AuthUser>> {
  const { user, reason } = await resolveSession();
  if (!user) {
    await recordSecurityEvent({
      kind: "ACCESS_DENIED_UNAUTHENTICATED",
      severity: reason === "revoked-token-reuse" ? "critical" : "medium",
      route,
      detail: { reason: reason ?? "no-token" },
    });
    return { ok: false, response: denyJson(401) };
  }
  return { ok: true, user };
}

export async function requireApiRole(
  route: string,
  allowed: readonly UserRole[]
): Promise<ApiGuardResult<AuthUser>> {
  const auth = await requireApiUser(route);
  if (!auth.ok) return auth;

  if (!allowed.includes(auth.user.role)) {
    await recordSecurityEvent({
      kind: "ACCESS_DENIED_ROLE",
      severity: "high",
      userId: auth.user.id,
      route,
      detail: { held: auth.user.role, required: allowed },
    });
    return { ok: false, response: denyJson(403) };
  }
  return auth;
}

/**
 * Contrôle d'appartenance sur une ressource déjà chargée depuis la base.
 *
 * Le refus est renvoyé en 404 et non en 403 : sur un identifiant de facture ou
 * de devis, un 403 confirmerait l'existence de la ressource et permettrait
 * d'énumérer le portefeuille client.
 */
export async function authorizeResource(
  user: AuthUser,
  action: ActionType,
  resourceType: ResourceType,
  resource: ResourceOwnership,
  route: string
): Promise<NextResponse | null> {
  if (can(user, action, resourceType, resource)) return null;

  await recordSecurityEvent({
    kind: "ACCESS_DENIED_OWNERSHIP",
    severity: "high",
    userId: user.id,
    route,
    targetTable: resourceType,
    detail: { action, ownerId: resource.ownerId ?? resource.userId ?? null },
  });
  return denyJson(404);
}

export { denyJson };
