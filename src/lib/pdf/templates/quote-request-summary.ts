import "server-only";
import { PdfCanvas } from "../canvas";
import { formatDate, formatDateTime, formatFileSize } from "../format";
import type { QuoteRequestSummaryModel } from "@/lib/documents/models";

/**
 * Gabarit du récapitulatif de demande.
 *
 * Ce module ne connaît **que** son modèle : il n'interroge pas PostgreSQL, ne
 * lit pas la session et n'accède à aucun service. Il reçoit des valeurs déjà
 * choisies et déjà libellées, et les dispose sur la page.
 *
 * La séparation n'est pas décorative. Un gabarit qui interroge la base finit
 * par embarquer une jointure de plus « juste pour afficher », et c'est ainsi
 * qu'une note interne ou un identifiant technique se retrouve dans un document
 * remis au client. Ici, ce qui n'est pas dans le modèle ne peut pas être
 * imprimé.
 *
 * Le bandeau d'en-tête est typographique et non graphique : le dépôt ne
 * contient aucun fichier de logo. Plutôt qu'un cadre vide ou une image
 * d'emprunt, le nom de l'entreprise est composé. L'ajout d'un logo réel se
 * réduira à un `embedPng` lorsque l'actif existera.
 */

const LEGAL_NOTICE =
  "Ce document récapitule une demande de devis telle qu'enregistrée à la date " +
  "de génération. Il ne constitue ni un devis, ni un engagement contractuel, " +
  "ni une offre de prix. Seul un devis commercial signé engage l'entreprise.";

export async function renderQuoteRequestSummary(
  model: QuoteRequestSummaryModel
): Promise<Uint8Array> {
  const canvas = await PdfCanvas.create();
  const { palette, sizes, margin } = canvas;

  // --- En-tête -------------------------------------------------------------
  let headerTop = margin.top;

  canvas.textAt(model.company.name, margin.left, headerTop, {
    size: sizes.title,
    bold: true,
    color: palette.accent,
  });
  canvas.textRightAt("RÉCAPITULATIF DE DEMANDE", headerTop + 3, {
    size: sizes.heading,
    bold: true,
    color: palette.ink,
  });

  headerTop += sizes.title + 8;

  // Seules les lignes réellement renseignées sont composées. Un en-tête
  // affichant « BCE / TVA : null » ou une ligne vide décrédibiliserait le
  // document ; l'omission est préférable à l'invention comme au vide.
  const contactLine = [model.company.phone, model.company.email]
    .filter((value): value is string => Boolean(value))
    .join(" — ");

  const companyLines = [
    model.company.address,
    model.company.vatNumber ? `BCE / TVA : ${model.company.vatNumber}` : null,
    contactLine.length > 0 ? contactLine : null,
    model.company.insurance,
  ].filter((line): line is string => Boolean(line));
  const documentLines = [
    `Référence : ${model.documentReference}`,
    `Version ${model.versionNumber}`,
    `Établi le ${formatDate(model.generatedAt)}`,
  ];

  const headerLineHeight = sizes.small * 1.45;
  const headerRows = Math.max(companyLines.length, documentLines.length);

  for (let row = 0; row < headerRows; row += 1) {
    const y = headerTop + row * headerLineHeight;
    const companyLine = companyLines[row];
    const documentLine = documentLines[row];

    if (companyLine !== undefined) {
      canvas.textAt(companyLine, margin.left, y, {
        size: sizes.small,
        color: palette.muted,
      });
    }
    if (documentLine !== undefined) {
      canvas.textRightAt(documentLine, y, {
        size: sizes.small,
        bold: row === 0,
        color: row === 0 ? palette.ink : palette.muted,
      });
    }
  }

  canvas.setCursor(headerTop + headerRows * headerLineHeight + 14);

  // --- Demande concernée ---------------------------------------------------
  canvas.banner(
    `Demande ${model.request.reference}`,
    `Statut : ${model.request.statusLabel}`
  );

  if (model.request.isUrgent) {
    canvas.text("Demande signalée comme urgente par le client.", {
      size: sizes.small,
      bold: true,
      color: palette.accent,
    });
    canvas.moveDown(4);
  }

  // --- Demandeur -----------------------------------------------------------
  canvas.sectionTitle("Demandeur");
  canvas.fieldGrid([
    { label: "Nom", value: model.customer.fullName },
    { label: "Téléphone", value: model.customer.phone },
    { label: "Courriel", value: model.customer.email },
    {
      label: "Localité",
      value: `${model.customer.postalCode} ${model.customer.city}`.trim(),
    },
  ]);

  // --- Chantier ------------------------------------------------------------
  canvas.sectionTitle("Chantier");
  canvas.fieldGrid([
    { label: "Type d'intervention", value: model.project.interventionLabel },
    { label: "Type de toiture", value: model.project.roofLabel },
    { label: "Surface déclarée", value: model.project.surfaceLabel },
    {
      label: "Demande déposée le",
      value: formatDateTime(model.request.submittedAt),
    },
  ]);

  // --- Description ---------------------------------------------------------
  canvas.sectionTitle("Description fournie");
  const description = model.project.description?.trim();
  canvas.text(
    description && description.length > 0
      ? description
      : "Aucune description n'a été fournie avec la demande.",
    { color: description ? palette.ink : palette.muted }
  );

  // --- Pièces jointes ------------------------------------------------------
  canvas.sectionTitle("Pièces jointes");
  if (model.attachments.length === 0) {
    canvas.text("Aucune pièce jointe n'accompagne cette demande.", {
      color: palette.muted,
    });
  } else {
    canvas.table(
      [
        { header: "Fichier", width: 0.62 },
        { header: "Déposée le", width: 0.23 },
        { header: "Taille", width: 0.15, align: "right" },
      ],
      model.attachments.map((attachment) => [
        attachment.name,
        formatDate(attachment.uploadedAt),
        formatFileSize(attachment.sizeBytes),
      ])
    );
    canvas.text(
      "Les fichiers listés restent consultables depuis l'espace client ; ils ne sont pas incorporés à ce document.",
      { size: sizes.small, color: palette.muted }
    );
  }

  // --- Mentions ------------------------------------------------------------
  canvas.sectionTitle("Portée du document");
  canvas.text(LEGAL_NOTICE, { size: sizes.small, color: palette.muted });

  return canvas.finish({
    title: `Récapitulatif de demande ${model.request.reference}`,
    subject: `Demande de devis ${model.request.reference} — ${model.company.name}`,
    reference: model.documentReference,
    generatedAt: model.generatedAt,
  });
}
