import "server-only";
import { and, count, eq, gt, isNull, lt, or } from "drizzle-orm";
import QRCode from "qrcode";
import { db } from "@/db/client";
import {
  twoFactorRecoveryCodes,
  userTwoFactor,
} from "@/db/schema/accounts";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
} from "@/lib/auth/recovery-codes";
import {
  generateTotpSecret,
  verifyTotpTokenWithStep,
} from "@/lib/auth/totp";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";
import { AuthError } from "../auth-errors";

const SETUP_LIFETIME_MS = 10 * 60 * 1000;

function secretContext(userId: string): string {
  return `two-factor:${userId}`;
}

export interface TwoFactorStatus {
  enabled: boolean;
  confirmedAt: Date | null;
  recoveryCodesRemaining: number;
}

export async function getTwoFactorStatus(userId: string): Promise<TwoFactorStatus> {
  const [factor, recovery] = await Promise.all([
    db
      .select({
        enabled: userTwoFactor.enabled,
        confirmedAt: userTwoFactor.confirmedAt,
      })
      .from(userTwoFactor)
      .where(eq(userTwoFactor.userId, userId))
      .limit(1),
    db
      .select({ value: count() })
      .from(twoFactorRecoveryCodes)
      .where(
        and(
          eq(twoFactorRecoveryCodes.userId, userId),
          isNull(twoFactorRecoveryCodes.usedAt)
        )
      ),
  ]);
  return {
    enabled: factor[0]?.enabled === 1,
    confirmedAt: factor[0]?.confirmedAt ?? null,
    recoveryCodesRemaining: recovery[0]?.value ?? 0,
  };
}

export async function beginTwoFactorSetup(
  userId: string,
  email: string
): Promise<{ qrCodeDataUrl: string; manualKey: string; expiresAt: Date }> {
  const generated = generateTotpSecret(email);
  const expiresAt = new Date(Date.now() + SETUP_LIFETIME_MS);
  const encryptedSecret = encryptSecret(generated.base32, secretContext(userId));

  await db
    .insert(userTwoFactor)
    .values({
      userId,
      enabled: 0,
      encryptedSecret,
      confirmedAt: null,
      pendingExpiresAt: expiresAt,
      lastUsedTimeStep: null,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: userTwoFactor.userId,
      set: {
        enabled: 0,
        encryptedSecret,
        confirmedAt: null,
        pendingExpiresAt: expiresAt,
        lastUsedTimeStep: null,
        updatedAt: new Date(),
      },
    });

  await db
    .delete(twoFactorRecoveryCodes)
    .where(eq(twoFactorRecoveryCodes.userId, userId));

  const qrCodeDataUrl = await QRCode.toDataURL(generated.otpauth_url, {
    errorCorrectionLevel: "M",
    margin: 1,
    width: 240,
  });
  return { qrCodeDataUrl, manualKey: generated.base32, expiresAt };
}

export async function confirmTwoFactorSetup(
  userId: string,
  code: string
): Promise<string[]> {
  const factor = await db
    .select()
    .from(userTwoFactor)
    .where(
      and(
        eq(userTwoFactor.userId, userId),
        eq(userTwoFactor.enabled, 0),
        gt(userTwoFactor.pendingExpiresAt, new Date())
      )
    )
    .limit(1);
  const row = factor[0];
  if (!row) throw new AuthError("TOKEN_EXPIRED");

  const secret = decryptSecret(row.encryptedSecret, secretContext(userId));
  const verdict = verifyTotpTokenWithStep(secret, code);
  if (!verdict.valid || verdict.timeStep === null) {
    throw new AuthError("INVALID_TWO_FACTOR_CODE");
  }

  const codes = generateRecoveryCodes();
  await db.transaction(async (transaction) => {
    await transaction
      .update(userTwoFactor)
      .set({
        enabled: 1,
        confirmedAt: new Date(),
        pendingExpiresAt: null,
        lastUsedTimeStep: verdict.timeStep,
        updatedAt: new Date(),
      })
      .where(eq(userTwoFactor.userId, userId));
    await transaction
      .delete(twoFactorRecoveryCodes)
      .where(eq(twoFactorRecoveryCodes.userId, userId));
    await transaction.insert(twoFactorRecoveryCodes).values(
      codes.map((recoveryCode) => ({
        userId,
        codeHash: hashRecoveryCode(recoveryCode),
      }))
    );
  });
  return codes;
}

export type SecondFactorMethod = "totp" | "recovery";

export interface SecondFactorResult {
  method: SecondFactorMethod;
  recoveryCodesRemaining: number | null;
}

export async function verifySecondFactor(input: {
  userId: string;
  encryptedSecret: string;
  lastUsedTimeStep: number | null;
  code: string;
  method: SecondFactorMethod;
}): Promise<SecondFactorResult> {
  if (input.method === "recovery") {
    const consumed = await db
      .update(twoFactorRecoveryCodes)
      .set({ usedAt: new Date() })
      .where(
        and(
          eq(twoFactorRecoveryCodes.userId, input.userId),
          eq(twoFactorRecoveryCodes.codeHash, hashRecoveryCode(input.code)),
          isNull(twoFactorRecoveryCodes.usedAt)
        )
      )
      .returning({ id: twoFactorRecoveryCodes.id });
    if (consumed.length !== 1) throw new AuthError("INVALID_RECOVERY_CODE");

    const remaining = await db
      .select({ value: count() })
      .from(twoFactorRecoveryCodes)
      .where(
        and(
          eq(twoFactorRecoveryCodes.userId, input.userId),
          isNull(twoFactorRecoveryCodes.usedAt)
        )
      );
    return {
      method: "recovery",
      recoveryCodesRemaining: remaining[0]?.value ?? 0,
    };
  }

  const secret = decryptSecret(
    input.encryptedSecret,
    secretContext(input.userId)
  );
  const verdict = verifyTotpTokenWithStep(secret, input.code);
  if (!verdict.valid || verdict.timeStep === null) {
    throw new AuthError("INVALID_TWO_FACTOR_CODE");
  }

  const advanced = await db
    .update(userTwoFactor)
    .set({ lastUsedTimeStep: verdict.timeStep, updatedAt: new Date() })
    .where(
      and(
        eq(userTwoFactor.userId, input.userId),
        or(
          isNull(userTwoFactor.lastUsedTimeStep),
          lt(userTwoFactor.lastUsedTimeStep, verdict.timeStep)
        )
      )
    )
    .returning({ userId: userTwoFactor.userId });
  if (advanced.length !== 1) throw new AuthError("INVALID_TWO_FACTOR_CODE");

  return { method: "totp", recoveryCodesRemaining: null };
}

export async function disableTwoFactor(userId: string): Promise<void> {
  await db.transaction(async (transaction) => {
    await transaction
      .delete(twoFactorRecoveryCodes)
      .where(eq(twoFactorRecoveryCodes.userId, userId));
    await transaction
      .delete(userTwoFactor)
      .where(eq(userTwoFactor.userId, userId));
  });
}

export async function regenerateRecoveryCodes(userId: string): Promise<string[]> {
  const codes = generateRecoveryCodes();
  await db.transaction(async (transaction) => {
    await transaction
      .delete(twoFactorRecoveryCodes)
      .where(eq(twoFactorRecoveryCodes.userId, userId));
    await transaction.insert(twoFactorRecoveryCodes).values(
      codes.map((code) => ({
        userId,
        codeHash: hashRecoveryCode(code),
      }))
    );
  });
  return codes;
}

export const TWO_FACTOR_POLICY = { setupLifetimeMs: SETUP_LIFETIME_MS } as const;
