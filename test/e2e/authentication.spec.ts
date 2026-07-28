import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import crypto from "node:crypto";
import postgres from "postgres";
import { generateTotpToken } from "../../src/lib/auth/totp";

const EMAIL = "account.lifecycle.e2e@example.test";
const PASSWORD = "Authentification-E2E-2026!";
const NEW_PASSWORD = "Authentification-Renouvellee-2026!";
const IP_HEADER = "cf-connecting-ip";

let manualKey = "";
let recoveryCodes: string[] = [];

function database() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl?.includes("_test")) {
    throw new Error("Une base E2E isolée est requise.");
  }
  return postgres(databaseUrl, { max: 1 });
}

function decryptOutboxPayload(
  encryptedPayload: string,
  eventType: string,
  entityId: string
): { path: string } {
  const [version, ivValue, tagValue, ciphertextValue] =
    encryptedPayload.split(".");
  expect(version).toBe("v1");
  const material =
    process.env.TWO_FACTOR_ENCRYPTION_KEY ??
    "dev-only-two-factor-encryption-key-not-for-production";
  const key = crypto.createHash("sha256").update(material, "utf8").digest();
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
    { authTagLength: 16 }
  );
  decipher.setAAD(
    Buffer.from(`notification-outbox:${eventType}:${entityId}`, "utf8")
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
  return JSON.parse(plaintext) as { path: string };
}

async function latestEmailPath(eventType: string): Promise<string> {
  const sql = database();
  try {
    const rows = await sql<
      { entity_id: string; encrypted_payload: string }[]
    >`
      select no.entity_id, no.encrypted_payload
      from notification_outbox no
      join users u on u.id = no.entity_id::uuid
      where u.normalized_email = ${EMAIL}
        and no.event_type = ${eventType}
      order by no.created_at desc
      limit 1
    `;
    const item = rows[0];
    expect(item?.encrypted_payload).toMatch(/^v1\./);
    expect(item?.encrypted_payload).not.toContain("token=");
    return decryptOutboxPayload(
      item.encrypted_payload,
      eventType,
      item.entity_id
    ).path;
  } finally {
    await sql.end();
  }
}

async function setClientIp(page: Page, suffix: number): Promise<void> {
  await page.setExtraHTTPHeaders({
    [IP_HEADER]: `198.51.100.${suffix}`,
  });
}

async function loginPassword(
  page: Page,
  password: string,
  expectSuccess = true
): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel(/Adresse Email/i).fill(EMAIL);
  await page.getByLabel(/Mot de Passe/i).fill(password);
  await page
    .getByRole("button", { name: /Accéder à mon Espace/i })
    .click();
  if (expectSuccess) {
    await expect(page).toHaveURL(/\/mon-compte/);
  } else {
    await expect(page).toHaveURL(/\/connexion/);
    await expect(page.locator("p[role='alert']")).toContainText(
      /Adresse e-mail ou mot de passe incorrect/i
    );
  }
}

async function loginWithRecovery(
  page: Page,
  code: string
): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel(/Adresse Email/i).fill(EMAIL);
  await page.getByLabel(/Mot de Passe/i).fill(NEW_PASSWORD);
  await page
    .getByRole("button", { name: /Accéder à mon Espace/i })
    .click();
  await expect(
    page.getByRole("heading", { name: /Vérification en deux étapes/i })
  ).toBeVisible();
  await page
    .getByRole("button", { name: /Utiliser un code de récupération/i })
    .click();
  await page.getByLabel(/Code de récupération/i).fill(code);
  await page
    .getByRole("button", { name: /Terminer la connexion/i })
    .click();
  await expect(page).toHaveURL(/\/mon-compte/);
}

async function closeContext(context: BrowserContext): Promise<void> {
  await context.close().catch(() => undefined);
}

test.describe.serial("cycle de vie d’authentification", () => {
  test("inscrit, vérifie, connecte et déconnecte un nouveau client", async ({
    page,
  }) => {
    await setClientIp(page, 21);
    await page.goto("/connexion");
    await page
      .getByRole("button", { name: /Créer un compte/i })
      .click();
    await page.getByLabel(/^Prénom$/i).fill("Alice");
    await page.getByLabel(/^Nom$/i).fill("Sécurité");
    await page.getByLabel(/^Adresse e-mail$/i).fill(EMAIL);
    await page.getByLabel(/^Mot de passe$/i).fill(PASSWORD);
    await page
      .getByLabel(/Confirmer le mot de passe/i)
      .fill(PASSWORD);
    await page
      .getByLabel(/conditions d’utilisation/i)
      .check();
    await page
      .getByLabel(/politique de confidentialité/i)
      .check();
    await page
      .getByRole("button", { name: /Créer mon compte/i })
      .click();
    await expect(page.getByRole("status")).toContainText(
      /boîte e-mail|adresse/i
    );

    const verificationPath = await latestEmailPath("auth.verify_email");
    await page.goto(verificationPath);
    await page
      .getByRole("button", { name: /Vérifier mon adresse/i })
      .click();
    await expect(page.getByRole("status")).toContainText(/vérifiée/i);

    await loginPassword(page, PASSWORD);
    await expect(
      page.getByRole("heading", { name: /Votre espace client/i })
    ).toBeVisible();
    await page
      .getByRole("button", { name: /^Se Déconnecter$/i })
      .click();
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("réinitialise le mot de passe et révoque l’ancienne session", async ({
    browser,
    page,
  }) => {
    const oldContextA = await browser.newContext({
      extraHTTPHeaders: { [IP_HEADER]: "198.51.100.22" },
    });
    const oldPageA = await oldContextA.newPage();
    try {
      await loginPassword(oldPageA, PASSWORD);

      await setClientIp(page, 24);
      await page.goto("/mot-de-passe-oublie");
      await page.getByLabel(/Adresse e-mail/i).fill(EMAIL);
      await page.getByRole("button", { name: /Recevoir le lien/i }).click();
      await expect(page.getByRole("status")).toContainText(
        /Si un compte correspond/i
      );

      const resetPath = await latestEmailPath("auth.password_reset");
      await page.goto(resetPath);
      await page.getByLabel(/^Nouveau mot de passe$/i).fill(NEW_PASSWORD);
      await page
        .getByLabel(/Confirmer le mot de passe/i)
        .fill(NEW_PASSWORD);
      await page
        .getByRole("button", { name: /Enregistrer le mot de passe/i })
        .click();
      await expect(page.getByRole("status")).toContainText(/réinitialisé/i);

      await oldPageA.goto("/mon-compte");
      await expect(oldPageA).toHaveURL(/\/connexion/);

      await loginPassword(page, PASSWORD, false);
      await loginPassword(page, NEW_PASSWORD);
    } finally {
      await closeContext(oldContextA);
    }
  });

  test("active la 2FA puis impose un challenge TOTP", async ({ page }) => {
    await setClientIp(page, 25);
    await loginPassword(page, NEW_PASSWORD);
    await page.goto("/mon-compte/securite");

    const setupForm = page.locator("form").filter({
      has: page.getByRole("button", { name: /Configurer la 2FA/i }),
    });
    await setupForm
      .getByPlaceholder(/Mot de passe actuel/i)
      .fill(NEW_PASSWORD);
    await setupForm
      .getByRole("button", { name: /Configurer la 2FA/i })
      .click();
    const manualKeyText = await page
      .getByText(/Clé manuelle/i)
      .textContent();
    manualKey = manualKeyText?.split(":").at(-1)?.trim() ?? "";
    expect(manualKey).toMatch(/^[A-Z2-7]+$/);

    const activationCode = generateTotpToken(manualKey, Date.now() - 30_000);
    expect(activationCode).toMatch(/^\d{6}$/);
    await page
      .getByPlaceholder(/Premier code à 6 chiffres/i)
      .fill(activationCode ?? "");
    await page
      .getByRole("button", {
        name: /Confirmer et afficher les codes de secours/i,
      })
      .click();
    const codesBox = page.getByText(/Affichage unique/i).locator("..");
    await expect(codesBox.locator("li")).toHaveCount(10);
    recoveryCodes = (await codesBox.locator("li").allTextContents()).map(
      (code) => code.trim()
    );
    expect(recoveryCodes).toHaveLength(10);

    const sql = database();
    try {
      const factors = await sql<
        { encrypted_secret: string; code_hash: string }[]
      >`
        select utf.encrypted_secret, trc.code_hash
        from users u
        join user_two_factor utf on utf.user_id = u.id
        join two_factor_recovery_codes trc on trc.user_id = u.id
        where u.normalized_email = ${EMAIL}
      `;
      expect(factors).toHaveLength(10);
      expect(factors[0]?.encrypted_secret).toMatch(/^v1\./);
      expect(factors[0]?.encrypted_secret).not.toContain(manualKey);
      expect(factors.some((row) => recoveryCodes.includes(row.code_hash))).toBe(
        false
      );
    } finally {
      await sql.end();
    }

    await page
      .getByRole("button", { name: /^Se Déconnecter$/i })
      .click();
    await page.goto("/connexion");
    await page.getByLabel(/Adresse Email/i).fill(EMAIL);
    await page.getByLabel(/Mot de Passe/i).fill(NEW_PASSWORD);
    await page
      .getByRole("button", { name: /Accéder à mon Espace/i })
      .click();
    await expect(
      page.getByRole("heading", { name: /Vérification en deux étapes/i })
    ).toBeVisible();
    await page
      .getByLabel(/^Code 2FA$/i)
      .fill(generateTotpToken(manualKey) ?? "");
    await page
      .getByRole("button", { name: /Terminer la connexion/i })
      .click();
    await expect(page).toHaveURL(/\/mon-compte/);
  });

  test("consomme un code de récupération une seule fois", async ({ page }) => {
    await setClientIp(page, 26);
    await loginWithRecovery(page, recoveryCodes[0] ?? "");
    const sql = database();
    try {
      const events = await sql<{ total: number }[]>`
        select count(*)::int as total
        from notification_outbox no
        join users u on u.id = no.entity_id::uuid
        where u.normalized_email = ${EMAIL}
          and no.event_type = 'auth.recovery_code_used'
      `;
      expect(events[0]?.total).toBe(1);
    } finally {
      await sql.end();
    }
    await page
      .getByRole("button", { name: /^Se Déconnecter$/i })
      .click();

    await page.goto("/connexion");
    await page.getByLabel(/Adresse Email/i).fill(EMAIL);
    await page.getByLabel(/Mot de Passe/i).fill(NEW_PASSWORD);
    await page
      .getByRole("button", { name: /Accéder à mon Espace/i })
      .click();
    await page
      .getByRole("button", { name: /Utiliser un code de récupération/i })
      .click();
    await page
      .getByLabel(/Code de récupération/i)
      .fill(recoveryCodes[0] ?? "");
    await page
      .getByRole("button", { name: /Terminer la connexion/i })
      .click();
    await expect(page.locator("p[role='alert']")).toContainText(/invalide/i);
    await expect(page).toHaveURL(/\/connexion/);
  });

  test("affiche deux appareils et révoque uniquement la session choisie", async ({
    browser,
  }) => {
    const contextA = await browser.newContext({
      extraHTTPHeaders: { [IP_HEADER]: "198.51.100.27" },
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 Chrome/130.0 Safari/537.36",
    });
    const contextB = await browser.newContext({
      extraHTTPHeaders: { [IP_HEADER]: "198.51.100.28" },
      userAgent: "Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Firefox/130.0",
    });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();
    try {
      await loginWithRecovery(pageA, recoveryCodes[1] ?? "");
      await loginWithRecovery(pageB, recoveryCodes[2] ?? "");
      await pageA.goto("/mon-compte/securite");

      const sessionsSection = pageA.locator("section").filter({
        has: pageA.getByRole("heading", { name: /Appareils connectés/i }),
      });
      const items = sessionsSection.locator("li");
      await expect(items).toHaveCount(3);
      await items
        .filter({ hasText: /Firefox sur Linux/i })
        .getByRole("button", { name: /Déconnecter/i })
        .click();
      await expect(items).toHaveCount(2);

      await pageB.goto("/mon-compte/securite");
      await expect(pageB).toHaveURL(/\/connexion/);
      await pageA.reload();
      await expect(pageA).toHaveURL(/\/mon-compte\/securite/);
    } finally {
      await closeContext(contextA);
      await closeContext(contextB);
    }
  });
});
