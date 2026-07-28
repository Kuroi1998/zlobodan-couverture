import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { and, desc, eq } from "drizzle-orm";
import { db, client } from "@/db/client";
import { notificationOutbox } from "@/db/schema/notifications";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { userTwoFactor } from "@/db/schema/accounts";
import { passwordResetTokens } from "@/db/schema/tokens";
import {
  beginLogin,
  completeTwoFactorLogin,
  confirmEmailChange,
  registerUser,
  requestEmailChange,
  requestPasswordReset,
  resetPassword,
  verifyEmailToken,
  changePassword,
  setupTwoFactor,
  activateTwoFactor,
  logoutUser,
  listActiveSessions,
  revokeOwnedSession,
} from "@/lib/services/auth-service";
import { decryptSecret } from "@/lib/security/secret-box";
import { generateTotpToken } from "@/lib/auth/totp";
import { hashToken } from "@/lib/auth/session";
import { verifyPassword } from "@/lib/auth/password";
import { resetMemoryRateLimits } from "@/lib/security/rate-limiter";

const EMAIL = "auth.lifecycle@example.test";
const CHANGED_EMAIL = "auth.changed@example.test";
const PASSWORD = "Longue-phrase-auth-2026!";
const NEXT_PASSWORD = "Nouvelle-phrase-auth-2026!";
const RESET_PASSWORD = "Reset-phrase-auth-2026!";

function tokenFromEncryptedOutbox(item: {
  eventType: string;
  entityId: string;
  encryptedPayload: string | null;
}): string {
  if (!item.encryptedPayload) throw new Error("Charge chiffrée absente.");
  const plaintext = decryptSecret(
    item.encryptedPayload,
    `notification-outbox:${item.eventType}:${item.entityId}`
  );
  const payload = JSON.parse(plaintext) as { path?: string };
  const path = payload.path;
  if (!path) throw new Error("Lien absent de la charge utile.");
  const token = new URL(path, "http://localhost").searchParams.get("token");
  if (!token) throw new Error("Jeton absent du lien.");
  return token;
}

async function latestEmail(kind: string, userId: string) {
  const rows = await db
    .select({
      eventType: notificationOutbox.eventType,
      entityId: notificationOutbox.entityId,
      encryptedPayload: notificationOutbox.encryptedPayload,
    })
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.eventType, kind),
        eq(notificationOutbox.entityId, userId)
      )
    )
    .orderBy(desc(notificationOutbox.createdAt))
    .limit(1);
  const item = rows[0];
  if (!item) throw new Error(`E-mail ${kind} absent.`);
  return item;
}

beforeAll(() => {
  resetMemoryRateLimits();
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(""),
    })
  );
});

afterAll(async () => {
  vi.unstubAllGlobals();
  const accounts = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.normalizedEmail, CHANGED_EMAIL));
  for (const account of accounts) {
    await db
      .delete(notificationOutbox)
      .where(eq(notificationOutbox.entityId, account.id));
    await db.delete(users).where(eq(users.id, account.id));
  }
  await client.end();
});

describe("cycle de vie complet de l'authentification", () => {
  it("inscrit, vérifie, gère les sessions, l'e-mail, le mot de passe et la 2FA", async () => {
    await registerUser({
      firstName: "Alice",
      lastName: "Sécurité",
      email: EMAIL,
      password: PASSWORD,
      ipAddress: "127.0.0.1",
    });
    const created = await db
      .select()
      .from(users)
      .where(eq(users.normalizedEmail, EMAIL))
      .limit(1);
    const account = created[0];
    expect(account).toMatchObject({
      status: "pending_verification",
      role: "client",
      firstName: "Alice",
    });
    expect(account?.passwordHash).not.toBe(PASSWORD);

    const verificationEmail = await latestEmail("auth.verify_email", account.id);
    expect(verificationEmail.encryptedPayload).not.toContain("token=");
    await verifyEmailToken(tokenFromEncryptedOutbox(verificationEmail));
    await expect(
      db
        .select({ status: users.status })
        .from(users)
        .where(eq(users.id, account.id))
    ).resolves.toEqual([{ status: "active" }]);

    const firstLogin = await beginLogin({
      email: EMAIL,
      password: PASSWORD,
      ipAddress: "127.0.0.1",
      userAgent: "Browser A",
    });
    const secondLogin = await beginLogin({
      email: EMAIL,
      password: PASSWORD,
      ipAddress: "127.0.0.2",
      userAgent: "Browser B",
    });
    expect(firstLogin.kind).toBe("authenticated");
    expect(secondLogin.kind).toBe("authenticated");
    if (firstLogin.kind !== "authenticated" || secondLogin.kind !== "authenticated") {
      throw new Error("Session sans 2FA attendue.");
    }
    expect(await listActiveSessions(account.id, firstLogin.session.id)).toHaveLength(2);
    expect(await revokeOwnedSession(account.id, secondLogin.session.id)).toBe(true);

    await requestEmailChange({
      userId: account.id,
      sessionId: firstLogin.session.id,
      currentPassword: PASSWORD,
      newEmail: CHANGED_EMAIL,
    });
    const changeEmail = await latestEmail("auth.email_change_requested", account.id);
    await confirmEmailChange({ token: tokenFromEncryptedOutbox(changeEmail) });
    const revokedAfterEmail = await db
      .select({ revokedAt: sessions.revokedAt })
      .from(sessions)
      .where(eq(sessions.id, firstLogin.session.id));
    expect(revokedAfterEmail[0]?.revokedAt).toBeInstanceOf(Date);

    const loginAfterEmail = await beginLogin({
      email: CHANGED_EMAIL,
      password: PASSWORD,
      ipAddress: "127.0.0.1",
      userAgent: "Browser A",
    });
    if (loginAfterEmail.kind !== "authenticated") {
      throw new Error("Session attendue après changement d'e-mail.");
    }
    await changePassword({
      userId: account.id,
      sessionId: loginAfterEmail.session.id,
      currentPassword: PASSWORD,
      newPassword: NEXT_PASSWORD,
    });

    await requestPasswordReset(CHANGED_EMAIL, "127.0.0.1");
    const resetEmail = await latestEmail("auth.password_reset", account.id);
    const resetToken = tokenFromEncryptedOutbox(resetEmail);
    expect(
      await db
        .select({ tokenHash: passwordResetTokens.tokenHash })
        .from(passwordResetTokens)
        .where(eq(passwordResetTokens.userId, account.id))
    ).toContainEqual({ tokenHash: hashToken(resetToken) });
    await resetPassword({ token: resetToken, newPassword: RESET_PASSWORD });
    const passwordRow = await db
      .select({ passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.id, account.id));
    expect(await verifyPassword(RESET_PASSWORD, passwordRow[0]?.passwordHash ?? "")).toBe(true);

    const loginForSetup = await beginLogin({
      email: CHANGED_EMAIL,
      password: RESET_PASSWORD,
      ipAddress: "127.0.0.1",
      userAgent: "Browser A",
    });
    if (loginForSetup.kind !== "authenticated") {
      throw new Error("Session attendue pour configurer la 2FA.");
    }
    const setup = await setupTwoFactor({
      userId: account.id,
      sessionId: loginForSetup.session.id,
      currentPassword: RESET_PASSWORD,
    });
    expect(setup.qrCodeDataUrl).toMatch(/^data:image\/png;base64,/);
    const storedFactor = await db
      .select({ secret: userTwoFactor.encryptedSecret })
      .from(userTwoFactor)
      .where(eq(userTwoFactor.userId, account.id));
    expect(storedFactor[0]?.secret).not.toContain(setup.manualKey);

    const totp = generateTotpToken(setup.manualKey);
    expect(totp).not.toBeNull();
    const recoveryCodes = await activateTwoFactor({
      userId: account.id,
      sessionId: loginForSetup.session.id,
      code: totp ?? "",
    });
    expect(recoveryCodes).toHaveLength(10);
    await logoutUser(loginForSetup.session.token);

    const challenged = await beginLogin({
      email: CHANGED_EMAIL,
      password: RESET_PASSWORD,
      ipAddress: "127.0.0.3",
      userAgent: "Browser C",
    });
    expect(challenged.kind).toBe("two-factor-required");
    if (challenged.kind !== "two-factor-required") {
      throw new Error("Challenge 2FA attendu.");
    }
    const recovered = await completeTwoFactorLogin({
      challengeToken: challenged.challengeToken,
      code: recoveryCodes[0],
      method: "recovery",
    });
    expect(recovered.user.id).toBe(account.id);
    await logoutUser(recovered.session.token);

    const replayChallenge = await beginLogin({
      email: CHANGED_EMAIL,
      password: RESET_PASSWORD,
      ipAddress: "127.0.0.4",
      userAgent: "Browser D",
    });
    if (replayChallenge.kind !== "two-factor-required") {
      throw new Error("Second challenge 2FA attendu.");
    }
    await expect(
      completeTwoFactorLogin({
        challengeToken: replayChallenge.challengeToken,
        code: recoveryCodes[0],
        method: "recovery",
      })
    ).rejects.toMatchObject({ code: "INVALID_RECOVERY_CODE" });
  });
});
