import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import { generateTotpToken } from "../../src/lib/auth/totp";

const CLIENT_EMAIL = "client.e2e@example.test";
const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
const ADMIN_EMAIL = "admin.e2e@example.test";
const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

let contactReference = "";
let quoteReference = "";
let attachmentId = "";

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
    contactReference = contacts[0]?.reference ?? "";
    quoteReference = requests[0]?.reference ?? "";
    attachmentId = requests[0]?.attachment_id ?? "";
  } finally {
    await sql.end();
  }
  expect(contactReference).toMatch(/^CNT-\d{4}-\d{6}$/);
  expect(quoteReference).toMatch(/^DEV-\d{4}-\d{6}$/);
  expect(attachmentId).toMatch(/^[0-9a-f-]{36}$/);
});

test.describe.serial("persistance après redémarrage du serveur", () => {
  test("retrouve le contact, le devis et le fichier dans l'administration", async ({
    page,
  }) => {
    const token = generateTotpToken(ADMIN_TOTP_SECRET);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, token ?? undefined);
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
  });

  test("retrouve le devis et son fichier dans l'espace client", async ({
    page,
  }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/mon-compte/devis");
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(quoteReference)).toBeVisible();
    const file = await page.request.get(
      `/api/files/quote-attachments/${attachmentId}`
    );
    expect(file.status()).toBe(200);
  });
});
