import "server-only";
import { and, desc, eq, gt, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { emailVerificationTokens } from "@/db/schema/tokens";
import { users } from "@/db/schema/users";
import {
  hashPassword,
  isPasswordPwned,
  validatePasswordPolicy,
} from "@/lib/auth/password";
import { generateToken, hashToken } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validations/normalize";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { AuthError } from "../auth-errors";
import { createAuthEmailOutboxEntry } from "../auth-email-service";
import { notificationOutbox } from "@/db/schema/notifications";

const VERIFICATION_LIFETIME_MS = 24 * 60 * 60 * 1000;
const RESEND_COOLDOWN_MS = 2 * 60 * 1000;

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  ipAddress?: string | null;
}

export async function registerUser(
  input: RegisterInput
): Promise<{ accepted: true }> {
  const normalizedEmail = normalizeEmail(input.email);
  const policy = validatePasswordPolicy(input.password);
  if (!policy.isValid) throw new AuthError("WEAK_PASSWORD");
  if (await isPasswordPwned(input.password)) {
    throw new AuthError("PWNED_PASSWORD");
  }

  const passwordHash = await hashPassword(input.password);
  try {
    const created = await db.transaction(async (transaction) => {
      const inserted = await transaction
        .insert(users)
        .values({
          email: normalizedEmail,
          normalizedEmail,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          phone: input.phone?.trim() || null,
          role: "client",
          status: "pending_verification",
        })
        .returning({ id: users.id, email: users.email });
      const user = inserted[0];
      if (!user) throw new Error("Création du compte non confirmée.");

      const token = generateToken();
      await transaction.insert(emailVerificationTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + VERIFICATION_LIFETIME_MS),
      });
      await transaction.insert(notificationOutbox).values(
        createAuthEmailOutboxEntry({
          kind: "auth.verify_email",
          userId: user.id,
          recipient: user.email,
          sensitive: {
            path: `/verification-email?token=${encodeURIComponent(token)}`,
          },
        })
      );
      return user;
    });

    await recordSecurityEvent({
      kind: "ACCOUNT_CREATED",
      severity: "info",
      userId: created.id,
      ipAddress: input.ipAddress,
    });
    await recordSecurityEvent({
      kind: "EMAIL_VERIFICATION_REQUESTED",
      severity: "info",
      userId: created.id,
      ipAddress: input.ipAddress,
    });
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      ipAddress: input.ipAddress,
      detail: { control: "register", outcome: "duplicate-email-suppressed" },
    });
  }
  return { accepted: true };
}

export async function resendVerificationEmail(
  email: string,
  ipAddress?: string | null
): Promise<{ accepted: true }> {
  const normalizedEmail = normalizeEmail(email);
  const account = await db
    .select({ id: users.id, email: users.email, verifiedAt: users.emailVerifiedAt })
    .from(users)
    .where(eq(users.normalizedEmail, normalizedEmail))
    .limit(1);
  const user = account[0];
  if (!user || user.verifiedAt) return { accepted: true };

  const recent = await db
    .select({ createdAt: emailVerificationTokens.createdAt })
    .from(emailVerificationTokens)
    .where(
      and(
        eq(emailVerificationTokens.userId, user.id),
        isNull(emailVerificationTokens.usedAt)
      )
    )
    .orderBy(desc(emailVerificationTokens.createdAt))
    .limit(1);
  if (
    recent[0] &&
    Date.now() - recent[0].createdAt.getTime() < RESEND_COOLDOWN_MS
  ) {
    return { accepted: true };
  }

  const token = generateToken();
  await db.transaction(async (transaction) => {
    await transaction
      .update(emailVerificationTokens)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(emailVerificationTokens.userId, user.id),
          isNull(emailVerificationTokens.usedAt)
        )
      );
    await transaction.insert(emailVerificationTokens).values({
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + VERIFICATION_LIFETIME_MS),
    });
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.verify_email",
        userId: user.id,
        recipient: user.email,
        sensitive: {
          path: `/verification-email?token=${encodeURIComponent(token)}`,
        },
      })
    );
  });

  await recordSecurityEvent({
    kind: "EMAIL_VERIFICATION_REQUESTED",
    severity: "info",
    userId: user.id,
    ipAddress,
    detail: { resent: true },
  });
  return { accepted: true };
}

export async function verifyEmailToken(
  rawToken: string,
  ipAddress?: string | null
): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const now = new Date();
  const userId = await db.transaction(async (transaction) => {
    const consumed = await transaction
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          isNull(emailVerificationTokens.usedAt),
          gt(emailVerificationTokens.expiresAt, now)
        )
      )
      .returning({ userId: emailVerificationTokens.userId });
    const token = consumed[0];
    if (!token) throw new AuthError("TOKEN_INVALID");

    const activated = await transaction
      .update(users)
      .set({
        emailVerifiedAt: now,
        status: "active",
        updatedAt: now,
      })
      .where(
        and(
          eq(users.id, token.userId),
          ne(users.status, "disabled"),
          isNull(users.deletedAt)
        )
      )
      .returning({ id: users.id, email: users.email });
    const user = activated[0];
    if (!user) throw new AuthError("TOKEN_INVALID");

    await transaction
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(
        and(
          eq(emailVerificationTokens.userId, user.id),
          isNull(emailVerificationTokens.usedAt)
        )
      );
    await transaction.insert(notificationOutbox).values(
      createAuthEmailOutboxEntry({
        kind: "auth.welcome",
        userId: user.id,
        recipient: user.email,
      })
    );
    return user.id;
  });

  await recordSecurityEvent({
    kind: "EMAIL_VERIFIED",
    severity: "info",
    userId,
    ipAddress,
  });
}

export const EMAIL_VERIFICATION_POLICY = {
  lifetimeMs: VERIFICATION_LIFETIME_MS,
  resendCooldownMs: RESEND_COOLDOWN_MS,
} as const;
