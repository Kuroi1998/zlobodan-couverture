import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { AuthError } from "../auth-errors";
import { queueAuthEmail } from "../auth-email-service";
import { verifySensitiveAction } from "./reauthentication-service";
import {
  isSessionRecentlyVerified,
  revokeOtherSessions,
} from "./session-service";
import {
  beginTwoFactorSetup,
  confirmTwoFactorSetup,
  disableTwoFactor,
  getTwoFactorStatus,
  regenerateRecoveryCodes,
} from "./two-factor-service";

export async function setupTwoFactor(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  verificationCode?: string;
}): Promise<{ qrCodeDataUrl: string; manualKey: string; expiresAt: Date }> {
  const user = await verifySensitiveAction(input);
  const status = await getTwoFactorStatus(user.id);
  if (status.enabled) throw new AuthError("REAUTHENTICATION_REQUIRED", 409);
  return beginTwoFactorSetup(user.id, user.email);
}

export async function activateTwoFactor(input: {
  userId: string;
  sessionId: string;
  code: string;
  ipAddress?: string | null;
}): Promise<string[]> {
  if (!(await isSessionRecentlyVerified(input.userId, input.sessionId))) {
    throw new AuthError("REAUTHENTICATION_REQUIRED");
  }
  const recoveryCodes = await confirmTwoFactorSetup(input.userId, input.code);
  await revokeOtherSessions(input.userId, input.sessionId);

  const status = await getTwoFactorStatus(input.userId);
  if (!status.enabled) throw new Error("Activation 2FA non confirmée.");
  const user = await db
    .select({ email: users.email })
    .from(users)
    .where(eq(users.id, input.userId))
    .limit(1);
  const email = user[0]?.email;
  if (email) {
    await queueAuthEmail({
      kind: "auth.two_factor_enabled",
      userId: input.userId,
      recipient: email,
    });
  }
  await recordSecurityEvent({
    kind: "TWO_FACTOR_ENABLED",
    severity: "high",
    userId: input.userId,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
  });
  return recoveryCodes;
}

export async function removeTwoFactor(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  verificationCode?: string;
  ipAddress?: string | null;
}): Promise<void> {
  const user = await verifySensitiveAction(input);
  const status = await getTwoFactorStatus(user.id);
  if (!status.enabled) throw new AuthError("TOKEN_INVALID", 409);

  await disableTwoFactor(user.id);
  await revokeOtherSessions(user.id, input.sessionId);
  await queueAuthEmail({
    kind: "auth.two_factor_disabled",
    userId: user.id,
    recipient: user.email,
  });
  await recordSecurityEvent({
    kind: "TWO_FACTOR_DISABLED",
    severity: "high",
    userId: user.id,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
  });
}

export async function replaceRecoveryCodes(input: {
  userId: string;
  sessionId: string;
  currentPassword: string;
  verificationCode?: string;
  ipAddress?: string | null;
}): Promise<string[]> {
  const user = await verifySensitiveAction(input);
  const status = await getTwoFactorStatus(user.id);
  if (!status.enabled) throw new AuthError("TOKEN_INVALID", 409);
  const codes = await regenerateRecoveryCodes(user.id);
  await recordSecurityEvent({
    kind: "TWO_FACTOR_RECOVERY_CODES_REGENERATED",
    severity: "high",
    userId: user.id,
    sessionId: input.sessionId,
    ipAddress: input.ipAddress,
  });
  return codes;
}
