import "server-only";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/sessions";
import { generateToken, hashToken } from "@/lib/auth/session";
import type { UserRole } from "@/lib/auth/permissions";

const SESSION_MAX_AGE_SECONDS: Record<UserRole, number> = {
  admin: 8 * 60 * 60,
  staff: 8 * 60 * 60,
  client: 7 * 24 * 60 * 60,
};

function deviceName(userAgent: string | null): string {
  if (!userAgent) return "Appareil inconnu";
  const browser = /Edg\//.test(userAgent)
    ? "Microsoft Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : "Navigateur";
  const platform = /Windows/i.test(userAgent)
    ? "Windows"
    : /Android/i.test(userAgent)
      ? "Android"
      : /iPhone|iPad/i.test(userAgent)
        ? "iOS"
        : /Mac OS/i.test(userAgent)
          ? "macOS"
          : /Linux/i.test(userAgent)
            ? "Linux"
            : "appareil inconnu";
  return `${browser} sur ${platform}`.slice(0, 160);
}

export interface CreatedSession {
  id: string;
  token: string;
  maxAgeSeconds: number;
  knownDevice: boolean;
  deviceName: string;
}

export async function createSessionForUser(input: {
  userId: string;
  role: UserRole;
  ipHash: string | null;
  userAgent: string | null;
}): Promise<CreatedSession> {
  const name = deviceName(input.userAgent);
  const prior = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, input.userId),
        input.ipHash ? eq(sessions.ipHash, input.ipHash) : isNull(sessions.ipHash),
        input.userAgent
          ? eq(sessions.userAgent, input.userAgent)
          : isNull(sessions.userAgent)
      )
    )
    .limit(1);

  const token = generateToken();
  const now = new Date();
  const maxAgeSeconds = SESSION_MAX_AGE_SECONDS[input.role];
  const inserted = await db
    .insert(sessions)
    .values({
      userId: input.userId,
      tokenHash: hashToken(token),
      ipHash: input.ipHash,
      userAgent: input.userAgent,
      deviceName: name,
      lastSeenAt: now,
      authenticatedAt: now,
      lastVerifiedAt: now,
      expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000),
    })
    .returning({ id: sessions.id });

  const row = inserted[0];
  if (!row) throw new Error("Création de session non confirmée.");
  return {
    id: row.id,
    token,
    maxAgeSeconds,
    knownDevice: prior.length > 0,
    deviceName: name,
  };
}

export interface AccountSession {
  id: string;
  deviceName: string;
  userAgent: string | null;
  createdAt: Date;
  lastSeenAt: Date | null;
  expiresAt: Date;
  current: boolean;
}

export async function listActiveSessions(
  userId: string,
  currentSessionId: string
): Promise<AccountSession[]> {
  const now = new Date();
  const rows = await db
    .select({
      id: sessions.id,
      deviceName: sessions.deviceName,
      userAgent: sessions.userAgent,
      createdAt: sessions.createdAt,
      lastSeenAt: sessions.lastSeenAt,
      expiresAt: sessions.expiresAt,
    })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, now)
      )
    )
    .orderBy(sessions.createdAt);

  return rows.map((row) => ({
    ...row,
    deviceName: row.deviceName ?? deviceName(row.userAgent),
    current: row.id === currentSessionId,
  }));
}

export async function revokeOwnedSession(
  userId: string,
  sessionId: string
): Promise<boolean> {
  const updated = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt)
      )
    )
    .returning({ id: sessions.id });
  return updated.length === 1;
}

export async function revokeOtherSessions(
  userId: string,
  keepSessionId: string
): Promise<number> {
  const updated = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(sessions.userId, userId),
        ne(sessions.id, keepSessionId),
        isNull(sessions.revokedAt)
      )
    )
    .returning({ id: sessions.id });
  return updated.length;
}

export async function revokeAllSessions(userId: string): Promise<number> {
  const updated = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)))
    .returning({ id: sessions.id });
  return updated.length;
}

export async function markSessionRecentlyVerified(sessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ lastVerifiedAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function isSessionRecentlyVerified(
  userId: string,
  sessionId: string,
  maxAgeMs = 15 * 60 * 1000
): Promise<boolean> {
  const threshold = new Date(Date.now() - maxAgeMs);
  const rows = await db
    .select({ id: sessions.id })
    .from(sessions)
    .where(
      and(
        eq(sessions.id, sessionId),
        eq(sessions.userId, userId),
        isNull(sessions.revokedAt),
        gt(sessions.lastVerifiedAt, threshold)
      )
    )
    .limit(1);
  return rows.length === 1;
}

export const SESSION_POLICY = { maxAgeSeconds: SESSION_MAX_AGE_SECONDS } as const;
