import { expect, type Page } from "@playwright/test";
import sharp from "sharp";
import { generateTotpToken } from "../../../src/lib/auth/totp";

export const CLIENT_EMAIL = "client.e2e@example.test";
export const CLIENT_PASSWORD = "Client-E2E-Password-2026!";
export const OTHER_CLIENT_EMAIL = "other.e2e@example.test";
export const OTHER_CLIENT_PASSWORD = "Other-E2E-Password-2026!";
export const ADMIN_EMAIL = "admin.e2e@example.test";
export const ADMIN_PASSWORD = "Admin-E2E-Password-2026!";
export const ADMIN_TOTP_SECRET = "JBSWY3DPEHPK3PXP";

let lastAdminTotpStep = -1;

async function nextAdminTotp(): Promise<string> {
  const deadline = Date.now() + 35_000;
  while (Date.now() < deadline) {
    const currentStep = Math.floor(Date.now() / 30_000);
    const step = [currentStep, currentStep + 1].find(
      (candidate) => candidate > lastAdminTotpStep
    );
    if (step !== undefined) {
      lastAdminTotpStep = step;
      const token = generateTotpToken(ADMIN_TOTP_SECRET, step * 30_000);
      if (token) return token;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error("Aucun nouveau pas TOTP admin n'est encore disponible.");
}

export async function login(
  page: Page,
  email: string,
  password: string,
  totpCode?: string
): Promise<void> {
  await page.goto("/connexion");
  await page.getByLabel(/Adresse Email/i).fill(email);
  await page.getByLabel(/Mot de Passe/i).fill(password);
  if (totpCode) {
    await page
      .getByLabel(/Code 2FA/i)
      .fill(email === ADMIN_EMAIL ? await nextAdminTotp() : totpCode);
  }
  await page.getByRole("button", { name: /Accéder à mon Espace/i }).click();
  await expect(page).not.toHaveURL(/\/connexion/);
}

/**
 * En-têtes d'une requête mutante hors navigateur.
 *
 * `page.request` ne pose ni `Origin` ni `Sec-Fetch-Site`, alors que le filtre
 * de bordure refuse toute mutation qui ne prouve pas son origine. Sans cet
 * en-tête, chaque assertion sur un refus d'autorisation passerait pour la
 * mauvaise raison : on vérifierait le contrôle CSRF en croyant vérifier le
 * contrôle de rôle.
 */
export function mutatingHeaders(page: Page): Record<string, string> {
  return { Origin: new URL(page.url()).origin };
}

export async function logout(page: Page): Promise<void> {
  await page.getByRole("button", { name: /déconnecter|quitter le back-office/i }).click();
  await expect(page).toHaveURL(/\/connexion/);
}

export interface SubmitQuoteOptions {
  email: string;
  fullName: string;
  verifyDraft?: boolean;
  attachmentName?: string;
}

export async function submitQuoteWizard(
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
