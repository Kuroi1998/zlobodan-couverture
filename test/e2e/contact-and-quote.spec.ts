import { expect, test, type Page } from "@playwright/test";
import postgres from "postgres";
import sharp from "sharp";
import { generateTotpToken } from "../../src/lib/auth/totp";

const CLIENT_EMAIL = "client.e2e@example.test";
const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
const OTHER_CLIENT_EMAIL = "other.e2e@example.test";
const OTHER_CLIENT_PASSWORD = "Other-E2E-Password-2026!";
const ADMIN_EMAIL = "admin.e2e@example.test";
const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

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

async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: /déconnecter|quitter le back-office/i }).click();
  await expect(page).toHaveURL(/\/connexion/);
}

interface SubmitQuoteOptions {
  email: string;
  fullName: string;
  verifyDraft?: boolean;
  attachmentName?: string;
}

async function submitQuoteWizard(
  page: Page,
  options: SubmitQuoteOptions
): Promise<string> {
  await page.goto("/devis");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /Réfection complète toiture/i }).click();
  await page.getByRole("button", { name: /Continuer vers l'étape 2/i }).click();
  if (options.verifyDraft) {
    const draftBanner = page.getByText(/Brouillon serveur/);
    await expect(draftBanner).toBeVisible();
    const draftReference =
      (await draftBanner.textContent())?.match(/DEV-\d{4}-\d{6}/)?.[0] ?? "";
    expect(draftReference).toMatch(/^DEV-\d{4}-\d{6}$/);
    await page.reload();
    await expect(page.getByText(draftReference)).toBeVisible();
    await page.getByRole("button", { name: /Réfection complète toiture/i }).click();
    await page.getByRole("button", { name: /Continuer vers l'étape 2/i }).click();
  }
  await page.getByRole("button", { name: /Ardoise naturelle/i }).click();
  await page.getByRole("button", { name: /Continuer vers l'étape 3/i }).click();
  await page.getByRole("button", { name: /50 à 100 m²/i }).click();
  await page.getByRole("button", { name: /Continuer vers l'étape 4/i }).click();
  await page.getByLabel(/Code Postal Belge/i).fill("1000");
  await page.getByLabel(/Commune Belge/i).fill("Bruxelles");
  await page.getByRole("button", { name: /Continuer vers l'étape 5/i }).click();
  await page.getByLabel(/Nom & Prénom/i).fill(options.fullName);
  await page.getByLabel(/Numéro de Téléphone/i).fill("0470123456");
  await page.getByLabel(/Adresse Email/i).fill(options.email);
  await page.getByLabel(/Précisions complémentaires/i).fill(
    "Réfection complète avec isolation et contrôle de la sous-toiture."
  );
  const png = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: "#c2410c",
    },
  })
    .png()
    .toBuffer();
  await page.locator("#photo-upload-input").setInputFiles({
    name: options.attachmentName ?? "toiture-e2e.png",
    mimeType: "image/png",
    buffer: png,
  });
  await page.getByLabel(/J'accepte que mes données/i).check();
  await page.getByRole("button", { name: /Envoyer ma Demande de Devis/i }).click();
  await expect(page).toHaveURL(/\/devis\/merci\?reference=DEV-\d{4}-\d{6}/);
  const reference = new URL(page.url()).searchParams.get("reference");
  expect(reference).toMatch(/^DEV-\d{4}-\d{6}$/);
  await page.reload();
  await expect(page.getByText(reference ?? "")).toBeVisible();
  return reference ?? "";
}

test.describe.serial("contacts, devis et autorisations", () => {
  let contactReference = "";
  let anonymousQuoteReference = "";
  let quoteReference = "";
  let attachmentId = "";

  test("enregistre un message de contact via le formulaire public", async ({ page }) => {
    await page.goto("/contact");
    await page.getByLabel(/Nom complet/i).fill("Visiteur E2E");
    await page.getByLabel(/^Téléphone/i).fill("0470112233");
    await page.getByLabel(/^Email/i).fill("visitor.e2e@example.test");
    await page.getByLabel(/^Sujet/i).selectOption("general");
    await page.getByLabel(/Votre message/i).fill(
      "Je souhaite organiser une visite pour contrôler ma toiture."
    );
    await page.getByLabel(/J'accepte le traitement/i).check();
    await page.getByRole("button", { name: /Envoyer le message/i }).click();
    const referenceNode = page.getByText(/Référence : CNT-\d{4}-\d{6}/);
    await expect(referenceNode).toBeVisible();
    contactReference =
      (await referenceNode.textContent())?.match(/CNT-\d{4}-\d{6}/)?.[0] ?? "";
    expect(contactReference).toMatch(/^CNT-\d{4}-\d{6}$/);
  });

  test("enregistre une demande de devis anonyme avec sa pièce jointe", async ({
    page,
  }) => {
    anonymousQuoteReference = await submitQuoteWizard(page, {
      email: "anonymous.quote.e2e@example.test",
      fullName: "Visiteur Devis E2E",
      attachmentName: "toiture-anonyme.png",
    });
  });

  test("rattache un devis et son fichier au client après reconnexion", async ({ page }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    quoteReference = await submitQuoteWizard(page, {
      email: CLIENT_EMAIL,
      fullName: "Client E2E",
      verifyDraft: true,
    });
    await page.goto("/mon-compte/devis");
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(quoteReference)).toBeVisible();
    await logout(page);
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/mon-compte/devis");
    await expect(page.getByText(quoteReference)).toBeVisible();

    const databaseUrl = process.env.DATABASE_URL;
    expect(databaseUrl).toBeTruthy();
    const sql = postgres(databaseUrl ?? "", { max: 1 });
    try {
      const rows = await sql<{ id: string }[]>`
        select qa.id
        from quote_attachments qa
        join quote_requests qr on qr.id = qa.quote_request_id
        where qr.reference = ${quoteReference}
        limit 1
      `;
      attachmentId = rows[0]?.id ?? "";
    } finally {
      await sql.end();
    }
    expect(attachmentId).toMatch(/^[0-9a-f-]{36}$/);
    const ownFile = await page.request.get(`/api/files/quote-attachments/${attachmentId}`);
    expect(ownFile.status()).toBe(200);
  });

  test("refuse doublons et fichiers invalides sans faux succès", async ({ page }) => {
    await page.goto("/");
    const idempotency = crypto.randomUUID();
    const duplicate = await page.evaluate(async ({ key }) => {
      const payload = {
        fullName: "Contact Idempotent",
        email: "idempotent.e2e@example.test",
        phone: "0470998877",
        subject: "other",
        message: "Ce message doit être enregistré une seule fois.",
        consentPrivacy: true,
        form_started_at: Date.now() - 2_000,
      };
      const send = () =>
        fetch("/api/contact", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": key,
          },
          body: JSON.stringify(payload),
        });
      const first = await send();
      const firstBody = await first.json();
      const second = await send();
      const secondBody = await second.json();
      return {
        firstStatus: first.status,
        secondStatus: second.status,
        firstReference: firstBody.reference,
        secondReference: secondBody.reference,
      };
    }, { key: idempotency });
    expect(duplicate.firstStatus).toBe(201);
    expect(duplicate.secondStatus).toBe(409);
    expect(duplicate.secondReference).toBe(duplicate.firstReference);

    const invalidUploadStatus = await page.evaluate(async ({ key }) => {
      const body = new FormData();
      Object.entries({
        interventionType: "fuite",
        roofType: "ardoise",
        surface: "unknown",
        isUrgent: "true",
        postalCode: "1000",
        city: "Bruxelles",
        fullName: "Fichier Trompeur",
        phone: "0470556677",
        email: "invalid-upload.e2e@example.test",
        description: "Fichier invalide.",
        rgpdConsent: "true",
        form_started_at: String(Date.now() - 2_000),
      }).forEach(([name, value]) => body.append(name, value));
      body.append(
        "attachments",
        new File(["contenu exécutable"], "photo.jpg", { type: "image/jpeg" })
      );
      return (
        await fetch("/api/devis", {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body,
        })
      ).status;
    }, { key: crypto.randomUUID() });
    expect(invalidUploadStatus).toBe(422);

    const oversizedUploadStatus = await page.evaluate(async ({ key }) => {
      const body = new FormData();
      Object.entries({
        interventionType: "fuite",
        roofType: "ardoise",
        surface: "unknown",
        isUrgent: "true",
        postalCode: "1000",
        city: "Bruxelles",
        fullName: "Fichier Trop Lourd",
        phone: "0470556688",
        email: "oversized-upload.e2e@example.test",
        description: "Fichier trop lourd.",
        rgpdConsent: "true",
        form_started_at: String(Date.now() - 2_000),
      }).forEach(([name, value]) => body.append(name, value));
      body.append(
        "attachments",
        new File([new Uint8Array(10 * 1024 * 1024 + 1)], "large.jpg", {
          type: "image/jpeg",
        })
      );
      return (
        await fetch("/api/devis", {
          method: "POST",
          headers: { "Idempotency-Key": key },
          body,
        })
      ).status;
    }, { key: crypto.randomUUID() });
    expect(oversizedUploadStatus).toBe(413);
  });

  test("isole les fichiers entre clients", async ({ page }) => {
    await login(page, OTHER_CLIENT_EMAIL, OTHER_CLIENT_PASSWORD);
    await page.goto("/mon-compte/devis");
    await expect(page.getByText(quoteReference)).toHaveCount(0);
    const response = await page.request.get(
      `/api/files/quote-attachments/${attachmentId}`
    );
    expect(response.status()).toBe(404);
  });

  test("rend les soumissions visibles et gérables dans le back-office", async ({ page }) => {
    const token = generateTotpToken(ADMIN_TOTP_SECRET);
    expect(token).toMatch(/^\d{6}$/);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, token ?? undefined);
    await page.goto(`/admin/contacts?q=${encodeURIComponent(contactReference)}`);
    await expect(page.getByText(contactReference)).toBeVisible();
    await page.getByRole("link", { name: /Ouvrir/i }).click();
    await page.getByLabel(/Statut/i).selectOption("in_progress");
    await page.getByLabel(/Responsable/i).selectOption({ label: ADMIN_EMAIL });
    await page.getByLabel(/Motif/i).fill("Contact attribué par le test E2E.");
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(page.getByText(/Mise à jour enregistrée/i)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Statut/i)).toHaveValue("in_progress");
    await expect(page.getByLabel(/Responsable/i)).toHaveValue(/^[0-9a-f-]{36}$/);
    await page.goto(
      `/admin/demandes?q=${encodeURIComponent(anonymousQuoteReference)}`
    );
    await expect(page.getByText(anonymousQuoteReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(anonymousQuoteReference)).toBeVisible();
    await page.goto(`/admin/demandes?q=${encodeURIComponent(quoteReference)}`);
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.getByRole("link", { name: /Ouvrir/i }).click();
    await expect(page.getByRole("link", { name: /toiture-e2e\.jpg/i })).toBeVisible();
    await page.getByLabel(/Statut/i).selectOption("under_review");
    await page.getByLabel(/Responsable/i).selectOption({ label: ADMIN_EMAIL });
    await page.getByLabel(/Motif/i).fill("Dossier vérifié par le test E2E.");
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(page.getByText(/Mise à jour enregistrée/i)).toBeVisible();
    const file = await page.request.get(`/api/files/quote-attachments/${attachmentId}`);
    expect(file.status()).toBe(200);
  });
});
