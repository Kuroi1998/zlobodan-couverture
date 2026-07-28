import "server-only";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { authChallenges, userTwoFactor } from "@/db/schema/accounts";
import { users } from "@/db/schema/users";
import {
  consumeDummyVerification,
  hashPassword,
  needsPasswordRehash,
  verifyPassword,
} from "@/lib/auth/password";
import { getPostLoginDestination, isUserRole } from "@/lib/auth/destinations";
import { generateToken, hashIpAddress, hashToken } from "@/lib/auth/session";
import { normalizeEmail } from "@/lib/validations/normalize";
import { requireTurnstilePass } from "@/lib/auth/turnstile";
import {
  clearLoginFailures,
  getLoginGate,
} from "@/lib/security/login-throttle";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { safeReturnPath } from "@/lib/security/urls";
import type { AuthUser, UserRole } from "@/lib/auth/permissions";
import { AuthError } from "../auth-errors";
import { queueAuthEmail } from "../auth-email-service";
import { createSessionForUser, type CreatedSession } from "./session-service";
import {
  verifySecondFactor,
  type SecondFactorMethod,
} from "./two-factor-service";
import {
  ACCOUNT_LOCK_MS,
  failAuthentication,
} from "./login-attempt-service";

const CHALLENGE_LIFETIME_MS = 10 * 60 * 1000;
const PRIVILEGED_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  "admin",
  "staff",
]);

export interface LoginInput {
  email: string;
  password: string;
  captchaToken?: string;
  requestedPath?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

export type BeginLoginResult =
  | {
      kind: "authenticated";
      user: AuthUser;
      session: CreatedSession;
      destination: string;
    }
  | {
      kind: "two-factor-required";
      challengeToken: string;
      expiresAt: Date;
    };

async function completePasswordOnlyLogin(input: {
  user: AuthUser;
  requestedPath?: string;
  ipAddress: string | null;
  userAgent: string | null;
}): Promise<BeginLoginResult> {
  const ipHash = input.ipAddress ? hashIpAddress(input.ipAddress) : null;
  const session = await createSessionForUser({
    userId: input.user.id,
    role: input.user.role,
    ipHash,
    userAgent: input.userAgent,
  });

  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(users.id, input.user.id));

  await recordSecurityEvent({
    kind: session.knownDevice ? "LOGIN_SUCCESS" : "LOGIN_NEW_DEVICE",
    severity: session.knownDevice ? "info" : "medium",
    userId: input.user.id,
    sessionId: session.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    detail: { role: input.user.role },
  });
  if (!session.knownDevice) {
    await queueAuthEmail({
      kind: "auth.new_device_login",
      userId: input.user.id,
      recipient: input.user.email,
      payload: { device: session.deviceName },
    });
  }

  return {
    kind: "authenticated",
    user: input.user,
    session,
    destination: getPostLoginDestination(
      input.user.role,
      input.requestedPath
    ),
  };
}

export async function beginLogin(input: LoginInput): Promise<BeginLoginResult> {
  const normalizedEmail = normalizeEmail(input.email);
  const ipAddress = input.ipAddress ?? null;
  const userAgent = input.userAgent ?? null;
  const gate = await getLoginGate(normalizedEmail, ipAddress);
  if (gate.locked) throw new AuthError("INVALID_CREDENTIALS");

  if (gate.requiresChallenge) {
    if (!input.captchaToken) throw new AuthError("CHALLENGE_REQUIRED");
    if (!(await requireTurnstilePass(input.captchaToken, ipAddress))) {
      throw new AuthError("CHALLENGE_FAILED");
    }
  }

  const account = await db
    .select()
    .from(users)
    .where(eq(users.normalizedEmail, normalizedEmail))
    .limit(1);
  const user = account[0];
  if (!user) {
    await consumeDummyVerification(input.password);
    throw await failAuthentication(
      normalizedEmail,
      ipAddress,
      null,
      "unknown-account"
    );
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw await failAuthentication(
      normalizedEmail,
      ipAddress,
      user.id,
      "bad-password"
    );
  }
  if (!isUserRole(user.role)) {
    throw await failAuthentication(
      normalizedEmail,
      ipAddress,
      user.id,
      "unknown-role"
    );
  }

  const now = new Date();
  const lockExpired =
    user.status === "locked" &&
    user.lockedUntil &&
    user.lockedUntil.getTime() <= now.getTime();
  if (lockExpired) {
    await db
      .update(users)
      .set({ status: "active", lockedUntil: null, failedLoginAttempts: 0 })
      .where(eq(users.id, user.id));
  } else if (
    user.status !== "active" ||
    !user.emailVerifiedAt ||
    user.disabledAt ||
    user.deletedAt ||
    (user.lockedUntil && user.lockedUntil.getTime() > now.getTime())
  ) {
    await recordSecurityEvent({
      kind: "LOGIN_FAILED",
      severity: "medium",
      userId: user.id,
      ipAddress,
      detail: { reason: `account-${user.status}` },
    });
    throw new AuthError("INVALID_CREDENTIALS");
  }

  if (needsPasswordRehash(user.passwordHash)) {
    await db
      .update(users)
      .set({ passwordHash: await hashPassword(input.password), updatedAt: now })
      .where(eq(users.id, user.id));
  }
  await clearLoginFailures(normalizedEmail, ipAddress);

  const factor = await db
    .select()
    .from(userTwoFactor)
    .where(eq(userTwoFactor.userId, user.id))
    .limit(1);
  const twoFactor = factor[0];
  const requiresSecondFactor =
    PRIVILEGED_ROLES.has(user.role) || twoFactor?.enabled === 1;
  if (!requiresSecondFactor) {
    return completePasswordOnlyLogin({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        emailVerifiedAt: user.emailVerifiedAt,
      },
      requestedPath: input.requestedPath,
      ipAddress,
      userAgent,
    });
  }
  if (!twoFactor || twoFactor.enabled !== 1) {
    await recordSecurityEvent({
      kind: "TOTP_REQUIRED_NOT_ENROLLED",
      severity: "high",
      userId: user.id,
      ipAddress,
      detail: { role: user.role },
    });
    throw new AuthError("ACCOUNT_DISABLED");
  }

  const challengeToken = generateToken();
  const expiresAt = new Date(now.getTime() + CHALLENGE_LIFETIME_MS);
  await db.insert(authChallenges).values({
    userId: user.id,
    tokenHash: hashToken(challengeToken),
    purpose: "login",
    requestedPath: safeReturnPath(input.requestedPath, ""),
    ipHash: ipAddress ? hashIpAddress(ipAddress) : null,
    userAgent,
    expiresAt,
  });
  return { kind: "two-factor-required", challengeToken, expiresAt };
}

export async function completeTwoFactorLogin(input: {
  challengeToken: string;
  code: string;
  method: SecondFactorMethod;
}): Promise<Extract<BeginLoginResult, { kind: "authenticated" }>> {
  const tokenHash = hashToken(input.challengeToken);
  const claimed = await db
    .update(authChallenges)
    .set({ attempts: sql`${authChallenges.attempts} + 1` })
    .where(
      and(
        eq(authChallenges.tokenHash, tokenHash),
        eq(authChallenges.purpose, "login"),
        isNull(authChallenges.consumedAt),
        gt(authChallenges.expiresAt, new Date()),
        lt(authChallenges.attempts, authChallenges.maxAttempts)
      )
    )
    .returning();
  const challenge = claimed[0];
  if (!challenge) throw new AuthError("CHALLENGE_FAILED");

  const joined = await db
    .select({ user: users, factor: userTwoFactor })
    .from(users)
    .innerJoin(userTwoFactor, eq(userTwoFactor.userId, users.id))
    .where(
      and(
        eq(users.id, challenge.userId),
        eq(users.status, "active"),
        eq(userTwoFactor.enabled, 1)
      )
    )
    .limit(1);
  const account = joined[0];
  if (!account || !isUserRole(account.user.role)) {
    throw new AuthError("INVALID_CREDENTIALS");
  }

  let factorResult;
  try {
    factorResult = await verifySecondFactor({
      userId: account.user.id,
      encryptedSecret: account.factor.encryptedSecret,
      lastUsedTimeStep: account.factor.lastUsedTimeStep,
      code: input.code,
      method: input.method,
    });
  } catch (error) {
    await recordSecurityEvent({
      kind: "TOTP_FAILED",
      severity: "high",
      userId: account.user.id,
      detail: { method: input.method },
    });
    throw error;
  }

  const consumed = await db
    .update(authChallenges)
    .set({ consumedAt: new Date() })
    .where(
      and(
        eq(authChallenges.id, challenge.id),
        isNull(authChallenges.consumedAt)
      )
    )
    .returning({ id: authChallenges.id });
  if (consumed.length !== 1) throw new AuthError("CHALLENGE_FAILED");

  const session = await createSessionForUser({
    userId: account.user.id,
    role: account.user.role,
    ipHash: challenge.ipHash,
    userAgent: challenge.userAgent,
  });
  await db
    .update(users)
    .set({
      lastLoginAt: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, account.user.id));

  await recordSecurityEvent({
    kind:
      factorResult.method === "recovery"
        ? "TWO_FACTOR_RECOVERY_CODE_USED"
        : session.knownDevice
          ? "LOGIN_SUCCESS"
          : "LOGIN_NEW_DEVICE",
    severity: factorResult.method === "recovery" ? "high" : "info",
    userId: account.user.id,
    sessionId: session.id,
    userAgent: challenge.userAgent,
    detail: {
      role: account.user.role,
      recoveryCodesRemaining: factorResult.recoveryCodesRemaining,
    },
  });

  if (factorResult.method === "recovery") {
    await queueAuthEmail({
      kind: "auth.recovery_code_used",
      userId: account.user.id,
      recipient: account.user.email,
      payload: {
        remaining: String(factorResult.recoveryCodesRemaining ?? 0),
      },
    });
  } else if (!session.knownDevice) {
    await queueAuthEmail({
      kind: "auth.new_device_login",
      userId: account.user.id,
      recipient: account.user.email,
      payload: { device: session.deviceName },
    });
  }

  const authUser: AuthUser = {
    id: account.user.id,
    email: account.user.email,
    role: account.user.role,
    emailVerifiedAt: account.user.emailVerifiedAt,
  };
  return {
    kind: "authenticated",
    user: authUser,
    session,
    destination: getPostLoginDestination(
      authUser.role,
      challenge.requestedPath
    ),
  };
}

export const LOGIN_POLICY = {
  challengeLifetimeMs: CHALLENGE_LIFETIME_MS,
  accountLockMs: ACCOUNT_LOCK_MS,
} as const;
