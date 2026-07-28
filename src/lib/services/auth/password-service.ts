import "server-only";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationOutbox } from "@/db/schema/notifications";
import { sessions } from "@/db/schema/sessions";
import { passwordResetTokens } from "@/db/schema/tokens";
import { users } from "@/db/schema/users";
import {
  hashPassword,
  isPasswordPwned,
  validatePasswordPolicy,
  verifyPassword,
} from "@/lib/auth/password";
import {
  generateToken,
  hashIpAddress,
  hashToken,
} from "@/lib/auth/session";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { normalizeEmail } from "@/lib/validations/normalize";
import { AuthError } from "../auth-errors";
import { createAuthEmailOutboxEntry } from "../auth-email-service";
import { verifySensitiveAction } from "./reauthentication-service";

const RESET_LIFETIME_MS = 15 * 60 * 1000;
const RESET_COOLDOWN_MS = 5 * 60 * 1000;

export async function requestPasswordReset(
  email: string,
  ipAddress?: string | null
): Promise<{ accepted: true }> {
  const normalizedEmail = normalizeEmail(email);
  const account = await db
    .select({ id: users.id, email: users.email })
    .from(users)
    .where(
      and(
        eq(users.normalizedEmail, normalizedEmail),
        eq(users.status, "active"),
        isNull(users.deletedAt)
      )
    )
    .limit(1);
  const user = account[0];
  if (!user) return { accepted: true };

  const recent = await db
    .select({ createdAt: passwordResetTokens.createdAt })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, user.id),
        isNull(passwordResetTokens.usedAt)
      )
    )
    .orderBy(desc(passwordResetTokens.createdAt))
    .limit(1);
  if (
    recent[0] &&
    Date.now() - recent[0].createdAt.getTime() < RESET_COOLDOWN_MS
  ) {
    return { accepted: true };
  }

  const rawToken = generateToken();
  await db.transaction(async (transaction) => {
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );
    await transaction.insert(passwordResetTokens).values({
      userId: user.id,
      tokenHash: hashToken(rawToken),
      requestedIpHash: ipAddress ? hashIpAddress(ipAddress) : null,
      expiresAt: new Date(Date.now() + RESET_LIFETIME_MS),
    });
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.password_reset",
        userId: user.id,
        recipient: user.email,
        sensitive: {
          path: `/reinitialisation-mot-de-passe?token=${encodeURIComponent(rawToken)}`,
        },
      })
    );
  });

  await recordSecurityEvent({
    kind: "PASSWORD_RESET_REQUESTED",
    severity: "medium",
    userId: user.id,
    ipAddress,
  });
  return { accepted: true };
}

async function validateNewPassword(password: string): Promise<void> {
  if (!validatePasswordPolicy(password).isValid) {
    throw new AuthError("WEAK_PASSWORD");
  }
  if (await isPasswordPwned(password)) {
    throw new AuthError("PWNED_PASSWORD");
  }
}

export async function resetPassword(input: {
  token: string;
  newPassword: string;
  ipAddress?: string | null;
}): Promise<void> {
  await validateNewPassword(input.newPassword);
  const newHash = await hashPassword(input.newPassword);
  const now = new Date();

  const userId = await db.transaction(async (transaction) => {
    const consumed = await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.tokenHash, hashToken(input.token)),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now)
        )
      )
      .returning({ userId: passwordResetTokens.userId });
    const resetToken = consumed[0];
    if (!resetToken) throw new AuthError("TOKEN_INVALID");

    const updated = await transaction
      .update(users)
      .set({
        passwordHash: newHash,
        passwordChangedAt: now,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, resetToken.userId),
          ne(users.status, "disabled"),
          isNull(users.deletedAt)
        )
      )
      .returning({ id: users.id, email: users.email });
    const user = updated[0];
    if (!user) throw new AuthError("TOKEN_INVALID");

    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );
    await transaction
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(eq(sessions.userId, user.id), isNull(sessions.revokedAt))
      );
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.password_reset_completed",
        userId: user.id,
        recipient: user.email,
      })
    );
    return user.id;
  });

  await recordSecurityEvent({
    kind: "PASSWORD_RESET_COMPLETED",
    severity: "high",
    userId,
    ipAddress: input.ipAddress,
  });
}

export async function changePassword(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  newPassword: string;
  verificationCode?: string;
  ipAddress?: string | null;
}): Promise<void> {
  const user = await verifySensitiveAction(input);
  await validateNewPassword(input.newPassword);
  const current = await db
    .select({ passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);
  if (
    current[0] &&
    (await verifyPassword(input.newPassword, current[0].passwordHash))
  ) {
    throw new AuthError("WEAK_PASSWORD");
  }

  const now = new Date();
  const passwordHash = await hashPassword(input.newPassword);
  await db.transaction(async (transaction) => {
    await transaction
      .update(users)
      .set({ passwordHash, passwordChangedAt: now, updatedAt: now })
      .where(eq(users.id, user.id));
    await transaction
      .update(sessions)
      .set({ revokedAt: now })
      .where(
        and(
          eq(sessions.userId, user.id),
          ne(sessions.id, input.sessionId),
          isNull(sessions.revokedAt)
        )
      );
    await transaction
      .update(passwordResetTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(passwordResetTokens.userId, user.id),
          isNull(passwordResetTokens.usedAt)
        )
      );
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.password_changed",
        userId: user.id,
        recipient: user.email,
      })
    );
  });
  await recordSecurityEvent({
    kind: "PASSWORD_CHANGED",
    severity: "high",
    userId: user.id,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
  });
}

export const PASSWORD_RESET_POLICY = {
  lifetimeMs: RESET_LIFETIME_MS,
  cooldownMs: RESET_COOLDOWN_MS,
} as const;
