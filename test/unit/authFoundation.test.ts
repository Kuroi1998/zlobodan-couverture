import { afterEach, describe, expect, test, vi } from "vitest";
import bcrypt from "bcryptjs";
import {
  needsPasswordRehash,
  PASSWORD_LIMITS,
} from "@/lib/auth/password";
import {
  generateRecoveryCodes,
  hashRecoveryCode,
  normalizeRecoveryCode,
  RECOVERY_CODE_POLICY,
} from "@/lib/auth/recovery-codes";
import {
  generateTotpSecret,
  generateTotpToken,
  verifyTotpTokenWithStep,
} from "@/lib/auth/totp";
import {
  decryptSecret,
  encryptSecret,
  isEncryptedSecret,
} from "@/lib/security/secret-box";

afterEach(() => vi.unstubAllEnvs());

describe("Chiffrement des secrets d'authentification", () => {
  test("le secret TOTP n'apparaît pas dans le texte stocké", () => {
    vi.stubEnv(
      "TWO_FACTOR_ENCRYPTION_KEY",
      "test-encryption-key-distinct-and-long-enough"
    );
    const plaintext = "JBSWY3DPEHPK3PXP";
    const encrypted = encryptSecret(plaintext, "two-factor:user-1");
    expect(isEncryptedSecret(encrypted)).toBe(true);
    expect(encrypted).not.toContain(plaintext);
    expect(decryptSecret(encrypted, "two-factor:user-1")).toBe(plaintext);
  });

  test("le contexte empêche de déplacer un secret vers un autre compte", () => {
    vi.stubEnv(
      "TWO_FACTOR_ENCRYPTION_KEY",
      "test-encryption-key-distinct-and-long-enough"
    );
    const encrypted = encryptSecret("SECRET", "two-factor:user-1");
    expect(() => decryptSecret(encrypted, "two-factor:user-2")).toThrow();
  });
});

describe("Migration progressive des mots de passe", () => {
  test("un bcrypt au coût courant ne demande pas de rehash", async () => {
    const hash = await bcrypt.hash("phrase-de-passe-test", PASSWORD_LIMITS.BCRYPT_ROUNDS);
    expect(needsPasswordRehash(hash)).toBe(false);
  });

  test("un ancien coût et un format inconnu demandent un rehash", async () => {
    expect(needsPasswordRehash(await bcrypt.hash("phrase-de-passe-test", 8))).toBe(true);
    expect(needsPasswordRehash("format-inconnu")).toBe(true);
  });
});

describe("Codes de récupération", () => {
  test("ils sont uniques, normalisés et hachables sans stocker le clair", () => {
    const codes = generateRecoveryCodes();
    expect(codes).toHaveLength(RECOVERY_CODE_POLICY.count);
    expect(new Set(codes).size).toBe(codes.length);
    for (const code of codes) {
      expect(code).toMatch(/^[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}$/);
      expect(hashRecoveryCode(code)).toHaveLength(64);
      expect(hashRecoveryCode(code)).toBe(
        hashRecoveryCode(normalizeRecoveryCode(code))
      );
    }
  });
});

describe("Validation TOTP", () => {
  test("retourne le pas temporel utilisé pour empêcher sa réutilisation", () => {
    const secret = generateTotpSecret("client@example.test");
    const now = 1_800_000_000_000;
    const code = generateTotpToken(secret.base32, now);
    expect(code).not.toBeNull();
    const verdict = verifyTotpTokenWithStep(secret.base32, code ?? "", now);
    expect(verdict).toEqual({
      valid: true,
      timeStep: Math.floor(now / 30_000),
    });
  });
});
