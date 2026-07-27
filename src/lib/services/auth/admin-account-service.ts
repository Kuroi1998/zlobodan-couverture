import "server-only";
import { and, count, desc, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { userTwoFactor } from "@/db/schema/accounts";
import { notificationOutbox } from "@/db/schema/notifications";
import { securityEvents } from "@/db/schema/security-events";
import { sessions } from "@/db/schema/sessions";
import { users, type UserStatus } from "@/db/schema/users";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { createAuthEmailOutboxEntry } from "../auth-email-service";
import { requestPasswordReset } from "./password-service";

export async function getAccountAdministration(publicId: string) {
  const account = await db
    .select({
      id: users.id,
      publicId: users.publicId,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
      passwordChangedAt: users.passwordChangedAt,
      lastLoginAt: users.lastLoginAt,
      failedLoginAttempts: users.failedLoginAttempts,
      lockedUntil: users.lockedUntil,
      disabledAt: users.disabledAt,
      createdAt: users.createdAt,
      twoFactorEnabled: userTwoFactor.enabled,
    })
    .from(users)
    .leftJoin(userTwoFactor, eq(userTwoFactor.userId, users.id))
    .where(eq(users.publicId, publicId))
    .limit(1);
  const user = account[0];
  if (!user) return null;

  const active = await db
    .select({ value: count() })
    .from(sessions)
    .where(
      and(
        eq(sessions.userId, user.id),
        isNull(sessions.revokedAt),
        gt(sessions.expiresAt, new Date())
      )
    );
  return {
    ...user,
    twoFactorEnabled: user.twoFactorEnabled === 1,
    activeSessions: active[0]?.value ?? 0,
  };
}

export async function listAccountSecurityEvents(userId: string, limit = 50) {
  return db
    .select({
      id: securityEvents.id,
      eventType: securityEvents.eventType,
      severity: securityEvents.severity,
      route: securityEvents.route,
      userAgent: securityEvents.userAgent,
      metadata: securityEvents.metadata,
      createdAt: securityEvents.createdAt,
    })
    .from(securityEvents)
    .where(eq(securityEvents.userId, userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 100));
}

export async function setAccountStatus(input: {
  actorUserId: string;
  targetPublicId: string;
  status: Extract<UserStatus, "active" | "disabled">;
  reason: string;
  ipAddress?: string | null;
}): Promise<boolean> {
  const target = await db
    .select({
      id: users.id,
      email: users.email,
      role: users.role,
      status: users.status,
      emailVerifiedAt: users.emailVerifiedAt,
    })
    .from(users)
    .where(eq(users.publicId, input.targetPublicId))
    .limit(1);
  const account = target[0];
  if (
    !account ||
    account.id === input.actorUserId ||
    account.role === "admin" ||
    account.status === input.status ||
    (input.status === "active" && !account.emailVerifiedAt)
  ) {
    return false;
  }

  const now = new Date();
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({
        status: input.status,
        disabledAt: input.status === "disabled" ? now : null,
        lockedUntil: null,
        failedLoginAttempts: 0,
        updatedAt: now,
      })
      .where(eq(users.id, account.id));
    if (input.status === "disabled") {
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(sessions.userId, account.id),
            isNull(sessions.revokedAt)
          )
        );
    }
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind:
          input.status === "disabled"
            ? "auth.account_disabled"
            : "auth.account_enabled",
        userId: account.id,
        recipient: account.email,
      })
    );
  });

  await recordSecurityEvent({
    kind:
      input.status === "disabled" ? "ACCOUNT_DISABLED" : "ACCOUNT_ENABLED",
    severity: "high",
    userId: account.id,
    ipAddress: input.ipAddress,
    detail: {
      actorUserId: input.actorUserId,
      reason: input.reason,
      role: account.role,
    },
  });
  return true;
}

export async function revokeAccountSessions(input: {
  actorUserId: string;
  targetPublicId: string;
  ipAddress?: string | null;
}): Promise<boolean> {
  const target = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.publicId, input.targetPublicId))
    .limit(1);
  const account = target[0];
  if (!account) return false;

  await db.transaction(async (transaction) => {
    await transaction
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(sessions.userId, account.id),
          isNull(sessions.revokedAt)
        )
      );
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.sessions_revoked",
        userId: account.id,
        recipient: account.email,
      })
    );
  });
  await recordSecurityEvent({
    kind: "SESSION_REVOKED",
    severity: "high",
    userId: account.id,
    ipAddress: input.ipAddress,
    detail: { actorUserId: input.actorUserId, scope: "all" },
  });
  return true;
}

export async function triggerAdministrativePasswordReset(input: {
  actorUserId: string;
  targetPublicId: string;
  ipAddress?: string | null;
}): Promise<boolean> {
  const target = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(eq(users.publicId, input.targetPublicId))
    .limit(1);
  const account = target[0];
  if (!account) return false;
  await requestPasswordReset(account.email, input.ipAddress);
  await recordSecurityEvent({
    kind: "PASSWORD_RESET_REQUESTED",
    severity: "high",
    userId: account.id,
    ipAddress: input.ipAddress,
    detail: { actorUserId: input.actorUserId, administrative: true },
  });
  return true;
}
