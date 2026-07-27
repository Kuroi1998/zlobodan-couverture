import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { userTwoFactor } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import { verifyPassword } from "@/lib/auth/password";
import type { AuthUser } from "@/lib/auth/permissions";
import { isUserRole } from "@/lib/auth/destinations";
import { AuthError } from "../auth-errors";
import { markSessionRecentlyVerified } from "./session-service";
import { verifySecondFactor } from "./two-factor-service";

export async function verifySensitiveAction(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  verificationCode?: string;
}): Promise<AuthUser> {
  const rows = await db
    .select({ user: users, factor: userTwoFactor })
    .from(users)
    .leftJoin(userTwoFactor, eq(userTwoFactor.userId, users.id))
    .where(
      and(
        eq(users.id, input.userId),
        eq(users.status, "active"),
        isNull(users.deletedAt)
      )
    )
    .limit(1);
  const account = rows[0];
  if (
    !account ||
    !isUserRole(account.user.role) ||
    !(await verifyPassword(input.currentPassword, account.user.passwordHash))
  ) {
    throw new AuthError("REAUTHENTICATION_REQUIRED");
  }

  if (account.factor?.enabled === 1) {
    if (!input.verificationCode) {
      throw new AuthError("REAUTHENTICATION_REQUIRED");
    }
    const method = /^\d{6}$/.test(input.verificationCode)
      ? "totp"
      : "recovery";
    await verifySecondFactor({
      userId: account.user.id,
      encryptedSecret: account.factor.encryptedSecret,
      lastUsedTimeStep: account.factor.lastUsedTimeStep,
      code: input.verificationCode,
      method,
    });
  }

  await markSessionRecentlyVerified(input.sessionId);
  return {
    id: account.user.id,
    email: account.user.email,
    role: account.user.role,
    emailVerifiedAt: account.user.emailVerifiedAt,
  };
}
