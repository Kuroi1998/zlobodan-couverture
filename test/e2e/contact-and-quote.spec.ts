import { expect, test } from "@playwright/test";
import postgres from "postgres";
import { generateTotpToken } from "../../src/lib/auth/totp";
import {
  ADMIN_EMAIL,
  ADMIN_PASSWORD,
  ADMIN_TOTP_SECRET,
  CLIENT_EMAIL,
  CLIENT_PASSWORD,
  OTHER_CLIENT_EMAIL,
  OTHER_CLIENT_PASSWORD,
  login,
  logout,
  mutatingHeaders,
  submitQuoteWizard,
} from "./support/portal";


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
    await page.goto("/mon-compte/demandes");
    await expect(page.getByText(quoteReference)).toBeVisible();
    await page.reload();
    await expect(page.getByText(quoteReference)).toBeVisible();
    await logout(page);
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/mon-compte/demandes");
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
    await page.goto("/mon-compte/demandes");
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

  test("persiste une note interne avec son auteur, sans jamais l'exposer au client", async ({
    page,
  }) => {
    const token = generateTotpToken(ADMIN_TOTP_SECRET);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, token ?? undefined);
    await page.goto(`/admin/demandes?q=${encodeURIComponent(quoteReference)}`);
    await page.getByRole("link", { name: /Ouvrir/i }).click();

    const note = `Note E2E ${Date.now()} — visite calée mardi.`;
    await page.getByPlaceholder(/Observation, suite à donner/i).fill(note);
    await page.getByRole("button", { name: /Ajouter la note/i }).click();
    await expect(page.getByText(/Note enregistrée/i)).toBeVisible();

    // Survit à l'actualisation, et porte l'adresse de son auteur.
    await page.reload();
    await expect(page.getByText(note)).toBeVisible();
    await expect(page.getByText(ADMIN_EMAIL, { exact: false }).first()).toBeVisible();
    await logout(page);

    // Le propriétaire du dossier ne doit en trouver aucune trace, ni dans le
    // rendu, ni dans la charge utile sérialisée de la page.
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto(`/mon-compte/demandes/${encodeURIComponent(quoteReference)}`);
    await expect(page.getByRole("heading", { name: quoteReference })).toBeVisible();
    expect(await page.content()).not.toContain(note);
  });

  test("ouvre le détail d'une demande et refuse celle d'un autre client", async ({
    page,
  }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);
    await page.goto("/mon-compte/demandes");
    await page.getByRole("link", { name: /Voir le détail/i }).first().click();
    await expect(page).toHaveURL(/\/mon-compte\/demandes\/DEV-\d{4}-\d{6}/);
    await expect(page.getByRole("heading", { name: quoteReference })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: quoteReference })).toBeVisible();
    await logout(page);

    // Même référence, autre compte : réponse neutre, identique à celle d'une
    // référence inexistante.
    //
    // On vérifie le rendu et non le code HTTP : la page est `force-dynamic` et
    // son layout interroge PostgreSQL, donc le flux de réponse est déjà
    // commencé quand `notFound()` s'exécute — Next ne peut plus poser le 404 et
    // sert la frontière avec un 200. La garantie qui compte est ailleurs, et
    // elle est testée ici : rien du dossier d'autrui n'atteint le navigateur.
    // Les routes d'API, elles, répondent bien 404 (test « isole les fichiers »).
    await login(page, OTHER_CLIENT_EMAIL, OTHER_CLIENT_PASSWORD);
    await page.goto(`/mon-compte/demandes/${encodeURIComponent(quoteReference)}`);
    await expect(page.getByRole("heading", { name: /Demande introuvable/i })).toBeVisible();

    // La référence figure dans l'URL saisie, donc dans la charge utile de
    // navigation : ce n'est pas une fuite, l'appelant l'a fournie lui-même. Ce
    // qui ne doit pas apparaître, c'est la **donnée** du dossier — description,
    // titulaire, localisation.
    const leaked = await page.content();
    expect(leaked).not.toContain("Réfection complète avec isolation");
    expect(leaked).not.toContain("Client E2E");

    // Une référence qui n'existe pour personne produit exactement la même page.
    await page.goto("/mon-compte/demandes/DEM-2026-000000");
    await expect(page.getByRole("heading", { name: /Demande introuvable/i })).toBeVisible();
  });

  /**
   * Un seul test pour les trois mutations client — profil, annulation,
   * refus du back-office. Les découper coûterait trois connexions
   * supplémentaires, et le quota de débit par IP (dix connexions par quart
   * d'heure) est lui-même une garantie du produit : le contourner en
   * l'assouplissant pour les tests reviendrait à ne plus le tester.
   */
  test("rend le compte réellement modifiable, annulable, et fermé au back-office", async ({
    page,
  }) => {
    await login(page, CLIENT_EMAIL, CLIENT_PASSWORD);

    // --- Profil : la modification atteint PostgreSQL ---------------------
    await page.goto("/mon-compte/parametres");
    await page.getByLabel(/Téléphone/i).fill("0470887766");
    await page.getByRole("button", { name: /Enregistrer/i }).click();
    await expect(page.getByText(/Profil mis à jour/i)).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(/Téléphone/i)).toHaveValue("0470887766");
    // L'adresse e-mail est affichée sans champ de saisie : elle n'est pas
    // modifiable, et l'interface ne le laisse pas croire.
    await expect(page.getByRole("textbox", { name: /Adresse e-mail/i })).toHaveCount(0);

    // --- Annulation : machine à états respectée --------------------------
    const reference = await submitQuoteWizard(page, {
      email: CLIENT_EMAIL,
      fullName: "Client E2E Annulation",
      attachmentName: "toiture-annulation.png",
    });
    await page.goto(`/mon-compte/demandes/${encodeURIComponent(reference)}`);
    await page.getByRole("button", { name: /Annuler cette demande/i }).click();
    await page.getByRole("button", { name: /Oui, annuler/i }).click();
    await expect(page.getByText(/annulée/i).first()).toBeVisible();

    await page.reload();
    await expect(page.getByText("Annulée").first()).toBeVisible();
    // Le bouton disparaît : la transition n'est plus déclarée, donc plus offerte.
    await expect(page.getByRole("button", { name: /Annuler cette demande/i })).toHaveCount(0);
    // Et le serveur refuse malgré tout l'appel direct — le bouton masqué n'est
    // pas la sécurité, il n'en est que la conséquence visible.
    const replay = await page.request.post(
      `/api/client/demandes/${encodeURIComponent(reference)}/cancel`,
      { data: {}, headers: mutatingHeaders(page) }
    );
    expect(replay.status()).toBe(409);

    // --- Back-office : fermé au rôle client ------------------------------
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/mon-compte/);
    await page.goto("/admin/demandes");
    await expect(page).toHaveURL(/\/mon-compte/);

    const note = await page.request.post("/api/admin/notes", {
      data: {
        entityType: "quote_request",
        entityId: "3f4c1b2e-0000-4000-8000-000000000000",
        content: "tentative client",
      },
      headers: mutatingHeaders(page),
    });
    expect(note.status()).toBe(403);

    const forbidden = await page.request.post(
      "/api/admin/demandes/3f4c1b2e-0000-4000-8000-000000000000/status",
      { data: { status: "under_review" }, headers: mutatingHeaders(page) }
    );
    expect(forbidden.status()).toBe(403);

    // --- Statuts invalides, depuis la session opérateur ------------------
    await logout(page);
    const token = generateTotpToken(ADMIN_TOTP_SECRET);
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD, token ?? undefined);

    const databaseUrl = process.env.DATABASE_URL;
    const sql = postgres(databaseUrl ?? "", { max: 1 });
    let requestId = "";
    try {
      const rows = await sql<{ id: string }[]>`
        select id from quote_requests where reference = ${reference} limit 1
      `;
      requestId = rows[0]?.id ?? "";
    } finally {
      await sql.end();
    }
    expect(requestId).not.toBe("");

    // Valeur hors domaine : refusée à la validation.
    const invalid = await page.request.post(`/api/admin/demandes/${requestId}/status`, {
      data: { status: "n_importe_quoi" },
      headers: mutatingHeaders(page),
    });
    expect(invalid.status()).toBe(422);

    // Valeur connue mais transition non déclarée depuis `cancelled` : refus
    // métier, jamais un 200 complaisant.
    const illegal = await page.request.post(`/api/admin/demandes/${requestId}/status`, {
      data: { status: "accepted" },
      headers: mutatingHeaders(page),
    });
    expect(illegal.status()).toBe(409);
  });
});
