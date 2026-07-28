import { expect, test, type Page } from "@playwright/test";
import crypto from "node:crypto";
import postgres from "postgres";
import { generateTotpToken } from "../../src/lib/auth/totp";

const CLIENT_EMAIL = "client.e2e@example.test";
const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
const ADMIN_EMAIL = "admin.e2e@example.test";
const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";
const AUTH_EMAIL = "account.lifecycle.e2e@example.test";
const AUTH_PASSWORD = "Authentification-Renouvellee-2026!";

let contactReference = "";
let quoteReference = "";
let attachmentId = "";
let cancelledReference = "";
let noteContent = "";
let persistedAuthSessions = 0;
let persistedAuthSecret = "";
let persistedAuthLastStep = -1;
let persistedAdminLastStep = -1;

function decryptAuthSecret(value: string, userId: string): string {
  const [version, ivValue, tagValue, encryptedValue] = value.split(".");
  if (version !== "v1") throw new Error("Secret 2FA persistant invalide.");
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
  decipher.setAAD(Buffer.from(`two-factor:${userId}`, "utf8"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

async function nextPersistedTotp(
  secret: string,
  lastStep: number
): Promise<string> {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const current = Math.floor(Date.now() / 30_000);
    const step = [current, current + 1].find(
      (candidate) => candidate > lastStep
    );
    if (step !== undefined) {
      const token = generateTotpToken(secret, step * 30_000);
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Aucun nouveau pas TOTP disponible après redémarrage.");
}

async function login(
  page: Page,
  email: string,
  password: string,
  totpCode?: string
): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel(/Adresse Email/i).fill(email);
  await page.getByLabel(/Mot de Passe/i).fill(password);
  if (totpCode) await page.getByLabel(/Code 2FA/i).fill(totpCode);
  await page.getByRole("button", { name: /Accéder à mon Espace/i }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

test.beforeAll(async () => {
  const databaseUrl = process.env.DATABASE_URL;
  expect(databaseUrl).toBeTruthy();
  const sql = postgres(databaseUrl ?? "", { max: 1 });
  try {
    const contacts = await sql<{ reference: string }[]>`
      select reference
      from contact_messages
      where email = 'visitor.e2e@example.test' and status = 'in_progress'
      order by created_at desc
      limit 1
    `;
    const requests = await sql<
      { reference: string; attachment_id: string }[]
    >`
      select qr.reference, qa.id as attachment_id
      from quote_requests qr
      join quote_attachments qa on qa.quote_request_id = qr.id
      where qr.email = ${CLIENT_EMAIL}
        and qr.user_id is not null
        and qr.status = 'under_review'
      order by qr.created_at desc
      limit 1
    `;
    // Écritures introduites par la connexion réelle des écrans : annulation
    // client et note interne d'opérateur. Elles sont lues ici pour être
    // vérifiées après redémarrage, au même titre que les soumissions.
    const cancelled = await sql<{ reference: string }[]>`
      select reference
      from quote_requests
      where email = ${CLIENT_EMAIL} and status = 'cancelled'
      order by updated_at desc
      limit 1
    `;
    const notes = await sql<{ content: string }[]>`
      select content
      from internal_notes
      where entity_type = 'quote_request' and deleted_at is null
      order by created_at desc
      limit 1
    `;
    const auth = await sql<
      {
        id: string;
        encrypted_secret: string;
        last_used_time_step: string | null;
        active_sessions: number;
      }[]
    >`
      select
        u.id,
        utf.encrypted_secret,
        utf.last_used_time_step::text,
        count(s.id) filter (
          where s.revoked_at is null and s.expires_at > now()
        )::int as active_sessions
      from users u
      join user_two_factor utf on utf.user_id = u.id
      left join sessions s on s.user_id = u.id
      where u.normalized_email = ${AUTH_EMAIL} and utf.enabled = 1
      group by u.id, utf.encrypted_secret, utf.last_used_time_step
    `;
    const adminFactor = await sql<{ last_used_time_step: string | null }[]>`
      select utf.last_used_time_step::text
      from users u
      join user_two_factor utf on utf.user_id = u.id
      where u.normalized_email = ${ADMIN_EMAIL}
      limit 1
    `;

    contactReference = contacts[0]?.reference ?? "";
    quoteReference = requests[0]?.reference ?? "";
    attachmentId = requests[0]?.attachment_id ?? "";
    cancelledReference = cancelled[0]?.reference ?? "";
    noteContent = notes[0]?.content ?? "";
    const persistedAuth = auth[0];
    if (persistedAuth) {
      persistedAuthSecret = decryptAuthSecret(
        persistedAuth.encrypted_secret,
        persistedAuth.id
      );
      persistedAuthLastStep = Number(
        persistedAuth.last_used_time_step ?? "-1"
      );
      persistedAuthSessions = persistedAuth.active_sessions;
    }
    persistedAdminLastStep = Number(
      adminFactor[0]?.last_used_time_step ?? "-1"
    );
  } finally {
    await sql.end();
  }
  expect(contactReference).toMatch(/^CNT-\d{4}-\d{6}$/);
  expect(quoteReference).toMatch(/^DEV-\d{4}-\d{6}$/);
  expect(attachmentId).toMatch(/^[0-9a-f-]{36}$/);
  expect(cancelledReference).toMatch(/^DEV-\d{4}-\d{6}$/);
  expect(noteContent).toContain("Note E2E");
  expect(persistedAuthSecret).toMatch(/^[A-Z2-7]+$/);
  expect(persistedAuthSessions).toBeGreaterThan(0);
});

test.describe.serial("persistance après redémarrage du serveur", () => {
  test("retrouve la 2FA et les sessions puis révoque les anciens appareils", async ({
    page,
  }) => {
    await login(
      page,
      AUTH_EMAIL,
      AUTH_PASSWORD,
      await nextPersistedTotp(persistedAuthSecret, persistedAuthLastStep)
    );
    await page.goto("/mon-compte/securite");
    const section = page.locator("section").filter({
      has: page.getByRole("heading", { name: /Appareils connectés/i }),
    });
    const sessions = section.locator("li");
    await expect(section).toBeVisible();
    await expect(sessions).toHaveCount(persistedAuthSessions + 1);
    await section
      .getByRole("button", { name: /Fermer les autres/i })
      .click();
    await expect(sessions).toHaveCount(1);
    await page.reload();
    await expect(page).toHaveURL(/\/mon-compte\/securite/);
  });

  test("retrouve le contact, le devis et le fichier dans l'administration", async ({
    page,
  }) => {
    const token = await nextPersistedTotp(
      ADMIN_TOTP_SECRET,
      persistedAdminLastStep
    );
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, token);
    await page.goto(`/admin/contacts?q=${encodeURIComponent(contactReference)}`);
    await expect(page.getByText(contactReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(contactReference)).toBeVisible();

    await page.goto(`/admin/demandes?q=${encodeURIComponent(quoteReference)}`);
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.getByRole("link", { name: /Ouvrir/i }).click();
    await expect(page.getByRole("link", { name: /toiture-e2e\.jpg/i })).toBeVisible();
    const file = await page.request.get(
      `/api/files/quote-attachments/${attachmentId}`
    );
    expect(file.status()).toBe(200);

    // La note interne écrite avant l'arrêt est toujours là, avec son auteur :
    // elle vivait auparavant dans une colonne écrasable, sans historique. Elle
    // est portée par la demande ouverte ci-dessus.
    await expect(page.getByText(noteContent)).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL, { exact: false }).first()).toBeVisible();

    // La demande annulée par le client est bien vue comme telle côté bureau.
    // On vise la cellule du tableau : le libellé « Annulée » figure aussi dans
    // les options du filtre de statut, qui sont présentes mais non visibles.
    await page.goto(`/admin/demandes?q=${encodeURIComponent(cancelledReference)}`);
    await expect(page.getByRole("cell", { name: "Annulée", exact: true })).toBeVisible();
  });

  test("retrouve le devis et son fichier dans l'espace client", async ({
    page,
  }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/mon-compte/demandes");
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(quoteReference)).toBeVisible();
    const file = await page.request.get(
      `/api/files/quote-attachments/${attachmentId}`
    );
    expect(file.status()).toBe(200);

    // L'annulation décidée avant l'arrêt tient toujours, et le bouton reste
    // absent : l'état vient de la base, pas d'un reste d'état React.
    await page.goto(`/mon-compte/demandes/${encodeURIComponent(cancelledReference)}`);
    await expect(page.getByText("Annulée").first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Annuler cette demande/i })).toHaveCount(0);

    // La modification de profil a survécu au redémarrage.
    await page.goto("/mon-compte/parametres");
    await expect(page.getByLabel(/Téléphone/i)).toHaveValue("0470887766");
  });
});
