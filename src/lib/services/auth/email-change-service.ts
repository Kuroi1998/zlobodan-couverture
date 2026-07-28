import "server-only";
import { and, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { emailChangeRequests } from "@/db/schema/accounts";
import { notificationOutbox } from "@/db/schema/notifications";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { generateToken, hashToken } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validations/normalize";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { AuthError } from "../auth-errors";
import { createAuthEmailOutboxEntry } from "../auth-email-service";
import { verifySensitiveAction } from "./reauthentication-service";

const EMAIL_CHANGE_LIFETIME_MS = 30 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function requestEmailChange(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  verificationCode?: string;
  newEmail: string;
  ipAddress?: string | null;
}): Promise<void> {
  const user = await verifySensitiveAction(input);
  const normalizedNewEmail = normalizeEmail(input.newEmail);
  if (normalizedNewEmail === normalizeEmail(user.email)) {
    throw new AuthError("EMAIL_CONFLICT");
  }
  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.normalizedEmail, normalizedNewEmail))
    .limit(1);
  if (existing[0]) throw new AuthError("EMAIL_CONFLICT");

  const token = generateToken();
  const now = new Date();
  try {
    await db.transaction(async (transaction) => {
      await transaction
        .update(emailChangeRequests)
        .set({ expiresAt: now })
        .where(
          and(
            eq(emailChangeRequests.userId, user.id),
            isNull(emailChangeRequests.confirmedAt),
            gt(emailChangeRequests.expiresAt, now)
          )
        );
      await transaction.insert(emailChangeRequests).values({
        userId: user.id,
        newEmail: normalizedNewEmail,
        normalizedNewEmail,
        tokenHash: hashToken(token),
        expiresAt: new Date(now.getTime() + EMAIL_CHANGE_LIFETIME_MS),
      });
      await transaction.insert(notificationOutbox).values(
        createAuthEmailOutboxEntry({
          kind: "auth.email_change_requested",
          userId: user.id,
          recipient: normalizedNewEmail,
          sensitive: {
            path: `/confirmation-changement-email?token=${encodeURIComponent(token)}`,
          },
        })
      );
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AuthError("EMAIL_CONFLICT");
    throw error;
  }

  await recordSecurityEvent({
    kind: "EMAIL_CHANGE_REQUESTED",
    severity: "high",
    userId: user.id,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
  });
}

export async function confirmEmailChange(input: {
  token: string;
  ipAddress?: string | null;
}): Promise<void> {
  const now = new Date();
  let changedUserId: string | null = null;
  try {
    changedUserId = await db.transaction(async (transaction) => {
      const confirmed = await transaction
        .update(emailChangeRequests)
        .set({ confirmedAt: now })
        .where(
          and(
            eq(emailChangeRequests.tokenHash, hashToken(input.token)),
            isNull(emailChangeRequests.confirmedAt),
            gt(emailChangeRequests.expiresAt, now)
          )
        )
        .returning({
          userId: emailChangeRequests.userId,
          newEmail: emailChangeRequests.newEmail,
          normalizedNewEmail: emailChangeRequests.normalizedNewEmail,
        });
      const request = confirmed[0];
      if (!request) throw new AuthError("TOKEN_INVALID");

      const current = await transaction
        .select({ email: users.email })
        .from(users)
        .where(
          and(
            eq(users.id, request.userId),
            eq(users.status, "active"),
            isNull(users.deletedAt)
          )
        )
        .limit(1);
      const account = current[0];
      if (!account) throw new AuthError("TOKEN_INVALID");

      await transaction
        .update(users)
        .set({
          email: request.newEmail,
          normalizedEmail: request.normalizedNewEmail,
          emailVerifiedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(users.id, request.userId),
            ne(users.normalizedEmail, request.normalizedNewEmail)
          )
        );
      await transaction
        .update(sessions)
        .set({ revokedAt: now })
        .where(
          and(
            eq(sessions.userId, request.userId),
            isNull(sessions.revokedAt)
          )
        );
      await transaction.insert(notificationOutbox).values([
        createAuthEmailOutboxEntry({
          kind: "auth.email_changed",
          userId: request.userId,
          recipient: account.email,
          payload: { newEmail: request.newEmail },
        }),
        createAuthEmailOutboxEntry({
          kind: "auth.email_changed",
          userId: request.userId,
          recipient: request.newEmail,
          payload: { newEmail: request.newEmail },
        }),
      ]);
      return request.userId;
    });
  } catch (error) {
    if (isUniqueViolation(error)) throw new AuthError("EMAIL_CONFLICT");
    throw error;
  }

  await recordSecurityEvent({
    kind: "EMAIL_CHANGED",
    severity: "high",
    userId: changedUserId,
    ipAddress: input.ipAddress,
  });
}

export const EMAIL_CHANGE_POLICY = {
  lifetimeMs: EMAIL_CHANGE_LIFETIME_MS,
} as const;
