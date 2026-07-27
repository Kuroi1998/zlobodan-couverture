import { describe, expect, it } from "vitest";
import { PDFDocument, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { renderQuoteRequestSummary } from "@/lib/pdf/templates/quote-request-summary";
import type { QuoteRequestSummaryModel } from "@/lib/documents/models";

/**
 * Gabarit du récapitulatif.
 *
 * On ne se contente pas de vérifier que le fichier porte l'extension `.pdf` :
 * on le rouvre, on compte ses pages et on cherche son contenu dans les flux.
 */

function model(
  overrides: Partial<QuoteRequestSummaryModel> = {}
): QuoteRequestSummaryModel {
  return {
    documentReference: "REC-2026-000042",
    versionNumber: 1,
    generatedAt: new Date("2026-07-27T09:00:00Z"),
    company: {
      name: "Zlobodan Couverture-Zinguerie SRL",
      address: "Avenue Louise 14, 1050 Bruxelles, Belgique",
      vatNumber: "BE 0123.456.789",
      phone: "02 345 67 89",
      email: "contact@example.be",
      insurance: "Assurance décennale Exemple — police 12345",
    },
    request: {
      reference: "DEV-2026-000007",
      submittedAt: new Date("2026-07-20T08:30:00Z"),
      statusLabel: "En cours d'analyse",
      isUrgent: false,
    },
    customer: {
      fullName: "Amélie Dupont",
      email: "amelie@example.be",
      phone: "0470 12 34 56",
      city: "Liège",
      postalCode: "4000",
    },
    project: {
      interventionLabel: "Réfection de toiture",
      roofLabel: "Ardoise",
      surfaceLabel: "100 à 150 m²",
      description: "Fuite au niveau de la noue, visible depuis le grenier.",
    },
    attachments: [
      {
        name: "photo-toiture.jpg",
        sizeBytes: 245_000,
        uploadedAt: new Date("2026-07-20T08:31:00Z"),
      },
    ],
    ...overrides,
  };
}

/**
 * Texte réellement dessiné dans le document.
 *
 * Les flux de contenu sont compressés en Flate : chercher la chaîne dans les
 * octets bruts du fichier ne trouve rien, et un test qui s'en contenterait
 * passerait aussi bien sur un PDF vide. On décompresse donc chaque flux avant
 * d'y chercher quoi que ce soit.
 *
 * `pdf-lib` écrit ensuite les chaînes sous forme hexadécimale — `<50616765>
 * Tj` plutôt que `(Page) Tj` — qu'il faut convertir pour retrouver du texte
 * lisible. Le décodage en latin1 est correct ici : les polices standard
 * écrivent en WinAnsi, qui coïncide avec latin1 sur les accents français.
 */
async function drawnText(bytes: Uint8Array): Promise<string> {
  const doc = await PDFDocument.load(bytes, { updateMetadata: false });
  let raw = "";

  for (const [, object] of doc.context.enumerateIndirectObjects()) {
    if (!(object instanceof PDFRawStream)) continue;
    try {
      raw += Buffer.from(decodePDFRawStream(object).decode()).toString("latin1");
    } catch {
      // Flux non décodable (police incorporée, table de références) : sans
      // intérêt pour la vérification du texte.
    }
  }

  return raw.replace(/<([0-9A-Fa-f]+)>/g, (_match, hex: string) =>
    Buffer.from(hex, "hex").toString("latin1")
  );
}

describe("Récapitulatif de demande", () => {
  it("produit un PDF valide portant la bonne référence en métadonnées", async () => {
    const bytes = await renderQuoteRequestSummary(model());

    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");

    const reopened = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(reopened.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(reopened.getTitle()).toContain("DEV-2026-000007");
    expect(reopened.getProducer()).toBe("Zlobodan Couverture-Zinguerie SRL");
  });

  it("imprime les données réelles de la demande", async () => {
    const bytes = await renderQuoteRequestSummary(model());
    const content = await drawnText(bytes);

    // Vérifie qu'on imprime la vraie demande et non un gabarit de
    // démonstration : la référence du document, celle de la demande, le nom du
    // client et la pièce jointe doivent tous figurer dans le texte dessiné.
    expect(content).toContain("REC-2026-000042");
    expect(content).toContain("DEV-2026-000007");
    expect(content).toContain("Dupont");
    expect(content).toContain("photo-toiture.jpg");
  });

  it("n'imprime aucun identifiant technique ni donnée interne", async () => {
    const bytes = await renderQuoteRequestSummary(model());
    const content = await drawnText(bytes);

    // Le modèle ne porte tout simplement pas ces champs ; ce test verrouille
    // la propriété au cas où quelqu'un les rajouterait.
    expect(content).not.toContain("submission");
    expect(content).not.toContain("assignedTo");
    expect(content).not.toMatch(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}/);
  });

  it("signale une demande urgente", async () => {
    const urgent = model({
      request: { ...model().request, isUrgent: true },
    });
    expect(await drawnText(await renderQuoteRequestSummary(urgent))).toContain(
      "urgente"
    );
  });

  it("gère l'absence de description et de pièce jointe", async () => {
    const bare = model({
      project: { ...model().project, description: null },
      attachments: [],
    });
    const content = await drawnText(await renderQuoteRequestSummary(bare));

    expect(content).toContain("Aucune description");
    expect(content).toContain("Aucune pi"); // « Aucune pièce jointe… »
  });

  it("pagine une demande très volumineuse sans lever d'exception", async () => {
    const heavy = model({
      project: {
        ...model().project,
        description: "Description très détaillée du chantier. ".repeat(400),
      },
      attachments: Array.from({ length: 60 }, (_, index) => ({
        name: `piece-jointe-numero-${index}-nom-volontairement-long.jpeg`,
        sizeBytes: 1024 * (index + 1),
        uploadedAt: new Date("2026-07-20T08:31:00Z"),
      })),
    });

    const bytes = await renderQuoteRequestSummary(heavy);
    const reopened = await PDFDocument.load(bytes, { updateMetadata: false });
    expect(reopened.getPageCount()).toBeGreaterThan(2);
  });

  it("survit à une description hostile", async () => {
    // Emoji et cyrillique : hors WinAnsi. Sans translittération, `pdf-lib`
    // lèverait et la génération échouerait sur une saisie licite.
    const hostile = model({
      project: {
        ...model().project,
        description: "Toiture 🏠 endommagée — Привет — 100 m² — coût 1 500 €",
      },
    });

    const bytes = await renderQuoteRequestSummary(hostile);
    expect(Buffer.from(bytes.slice(0, 5)).toString("latin1")).toBe("%PDF-");
  });
});
