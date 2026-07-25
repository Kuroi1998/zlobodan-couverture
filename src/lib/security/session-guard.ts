import { cache } from "react";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { getSessionTokenFromCookie, hashToken } from "@/lib/auth/session";
import type { AuthUser, UserRole } from "@/lib/auth/permissions";
import { recordSecurityEvent } from "./security-events";

/**
 * Résolution et validation des sessions.
 *
 * Avant ce module, la table `sessions` était alimentée par le login mais
 * jamais relue : `expiresAt` et `revokedAt` n'étaient donc appliqués nulle
 * part et la déconnexion n'invalidait rien côté serveur (audit C6).
 *
 * Toute décision d'accès de l'application passe désormais par ici.
 */

export type SessionRejectionReason =
  | "no-token"
  | "unknown-token"
  | "revoked-token-reuse"
  | "expired"
  | "idle-timeout"
  | "user-disabled";

export interface SessionResolution {
  user: AuthUser | null;
  sessionId: string | null;
  reason: SessionRejectionReason | null;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Inactivité tolérée avant expiration. Sessions privilégiées volontairement courtes. */
const IDLE_TIMEOUT_MS: Record<UserRole, number> = {
  admin: 30 * MINUTE,
  staff: 30 * MINUTE,
  client: 7 * DAY,
};

/** Durée de vie absolue, indépendante de l'activité. */
const ABSOLUTE_TIMEOUT_MS: Record<UserRole, number> = {
  admin: 8 * HOUR,
  staff: 8 * HOUR,
  client: 7 * DAY,
};

/** Écriture de `lastSeenAt` throttlée pour ne pas générer un UPDATE par requête. */
const TOUCH_INTERVAL_MS = 60 * 1000;

function isKnownRole(value: string): value is UserRole {
  return value === "client" || value === "staff" || value === "admin";
}

/**
 * Un jeton révoqué qui se représente signifie qu'une copie du cookie circule.
 * On ne se contente pas de refuser la requête : on coupe toutes les sessions
 * du compte, puisqu'on ne sait pas laquelle est celle du légitime.
 */
async function handleRevokedTokenReuse(userId: string, sessionId: string): Promise<void> {
  const now = new Date();
  await db
    .update(sessions)
    .set({ revokedAt: now })
    .where(eq(sessions.userId, userId));

  await recordSecurityEvent({
    kind: "SESSION_TOKEN_REUSE",
    severity: "critical",
    userId,
    detail: {
      replayedSessionId: sessionId,
      action: "all_sessions_revoked",
    },
  });
}

async function touchSession(sessionId: string, lastSeenAt: Date | null, now: Date): Promise<void> {
  if (lastSeenAt && now.getTime() - lastSeenAt.getTime() < TOUCH_INTERVAL_MS) return;
  await db
    .update(sessions)
    .set({ lastSeenAt: now })
    .where(eq(sessions.id, sessionId));
}

async function resolveSessionUncached(): Promise<SessionResolution> {
  const empty = (reason: SessionRejectionReason): SessionResolution => ({
    user: null,
    sessionId: null,
    reason,
  });

  const token = getSessionTokenFromCookie();
  if (!token) return empty("no-token");

  const tokenHash = hashToken(token);

  const rows = await db
    .select({
      sessionId: sessions.id,
      revokedAt: sessions.revokedAt,
      expiresAt: sessions.expiresAt,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      userId: users.id,
      email: users.email,
      role: users.role,
      emailVerifiedAt: users.emailVerifiedAt,
      deletedAt: users.deletedAt,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(eq(sessions.tokenHash, tokenHash))
    .limit(1);

  const row = rows[0];
  if (!row) return empty("unknown-token");

  if (row.revokedAt) {
    await handleRevokedTokenReuse(row.userId, row.sessionId);
    return empty("revoked-token-reuse");
  }

  if (row.deletedAt) return empty("user-disabled");

  const now = new Date();
  if (row.expiresAt.getTime() <= now.getTime()) return empty("expired");

  const role: UserRole = isKnownRole(row.role) ? row.role : "client";

  if (now.getTime() - row.createdAt.getTime() > ABSOLUTE_TIMEOUT_MS[role]) {
    return empty("expired");
  }

  const referenceActivity = row.lastSeenAt ?? row.createdAt;
  if (now.getTime() - referenceActivity.getTime() > IDLE_TIMEOUT_MS[role]) {
    return empty("idle-timeout");
  }

  await touchSession(row.sessionId, row.lastSeenAt, now);

  return {
    user: {
      id: row.userId,
      email: row.email,
      role,
      emailVerifiedAt: row.emailVerifiedAt,
    },
    sessionId: row.sessionId,
    reason: null,
  };
}

/**
 * Mémoïsé pour la durée de la requête : un layout, une page et un handler
 * peuvent l'appeler sans multiplier les allers-retours base.
 */
export const resolveSession = cache(async (): Promise<SessionResolution> => {
  try {
    return await resolveSessionUncached();
  } catch (error) {
    // Une base injoignable ne doit jamais accorder un accès par défaut.
    await recordSecurityEvent({
      kind: "SESSION_RESOLUTION_FAILURE",
      severity: "high",
      detail: { message: error instanceof Error ? error.message : "unknown" },
    }).catch(() => undefined);
    return { user: null, sessionId: null, reason: "unknown-token" };
  }
});

export async function getCurrentUser(): Promise<AuthUser | null> {
  const { user } = await resolveSession();
  return user;
}

/** Révoque toutes les sessions d'un compte (réponse à incident, changement de mot de passe). */
export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.userId, userId));
}

export const SESSION_TIMEOUTS = { IDLE_TIMEOUT_MS, ABSOLUTE_TIMEOUT_MS };
