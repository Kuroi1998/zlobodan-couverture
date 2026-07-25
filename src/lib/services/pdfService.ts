import { siteData } from "@/data/siteData";
import { escapeHtml, formatAmount } from "@/lib/security/encoding";

/**
 * Générateur de documents commerciaux.
 *
 * Toute valeur interpolée passe par `escapeHtml` ou `formatAmount`, sans
 * exception. La version précédente insérait `data.number` — alimenté
 * directement par le segment d'URL — dans `<title>` et `<h2>`, ce qui donnait
 * une XSS réfléchie servie en `text/html` sur l'origine de l'application
 * (audit C4).
 *
 * Second verrou, appliqué côté route : les données rendues ici proviennent
 * exclusivement de la base, jamais de la requête.
 */

export interface PdfDocumentData {
  type: "quote" | "invoice";
  number: string;
  date: string;
  dueDateOrValidity: string;
  clientName: string;
  clientAddress: string;
  clientVat?: string;
  lines: { designation: string; qty: number; unit: string; priceHt: number; vatRate: number }[];
  amountHt: number;
  vatAmount: number;
  amountTtc: number;
}

export function generateServerPdfHtml(data: PdfDocumentData): string {
  const isInvoice = data.type === "invoice";
  const title = isInvoice
    ? `FACTURE N° ${escapeHtml(data.number)}`
    : `DEVIS N° ${escapeHtml(data.number)}`;

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Helvetica Neue', Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 0; padding: 40px; }
    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #ea580c; padding-bottom: 20px; margin-bottom: 30px; }
    .company-info h1 { font-size: 20px; font-weight: 800; color: #ea580c; margin: 0 0 5px 0; }
    .company-info p { margin: 2px 0; font-size: 11px; color: #64748b; }
    .doc-info { text-align: right; }
    .doc-info h2 { font-size: 18px; margin: 0 0 10px 0; color: #0f172a; }
    .client-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 30px; }
    table { w-full; width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    th { background-color: #0f172a; color: #ffffff; font-size: 10px; uppercase; text-align: left; padding: 10px; }
    td { border-bottom: 1px solid #e2e8f0; padding: 10px; font-size: 11px; }
    .totals { width: 300px; margin-left: auto; background: #f1f5f9; border-radius: 8px; padding: 15px; }
    .totals div { display: flex; justify-content: space-between; margin-bottom: 5px; }
    .totals .grand-total { font-size: 14px; font-weight: bold; color: #ea580c; border-top: 1px solid #cbd5e1; padding-top: 5px; }
    .legal-footer { margin-top: 50px; border-top: 1px solid #e2e8f0; pt-15px; padding-top: 15px; font-size: 9px; color: #94a3b8; text-align: center; line-height: 1.4; }
  </style>
</head>
<body>

  <div class="header">
    <div class="company-info">
      <h1>${escapeHtml(siteData.name.toUpperCase())}</h1>
      <p><strong>Siège social :</strong> ${escapeHtml(siteData.fullAddress)}</p>
      <p><strong>N° BCE / TVA :</strong> ${escapeHtml(siteData.siret)}</p>
      <p><strong>Téléphone :</strong> ${escapeHtml(siteData.phoneFormatted)} | <strong>Email :</strong> ${escapeHtml(siteData.email)}</p>
      <p><strong>Assurance Décennale Belge :</strong> ${escapeHtml(siteData.insuranceName)} (Police n° ${escapeHtml(siteData.insuranceNumber)})</p>
    </div>
    <div class="doc-info">
      <h2>${title}</h2>
      <p><strong>Date d'émission :</strong> ${escapeHtml(data.date)}</p>
      <p><strong>${isInvoice ? "Date d'échéance :" : "Validité jusqu'au :"}</strong> ${escapeHtml(data.dueDateOrValidity)}</p>
    </div>
  </div>

  <div class="client-box">
    <strong style="color: #64748b; font-size: 10px; text-transform: uppercase;">Destinataire / Client :</strong>
    <p style="margin: 5px 0 0 0; font-size: 14px; font-weight: bold; color: #0f172a;">${escapeHtml(data.clientName)}</p>
    <p style="margin: 2px 0 0 0; font-size: 12px; color: #475569;">${escapeHtml(data.clientAddress)}</p>
  </div>

  <table>
    <thead>
      <tr>
        <th>Désignation des Travaux &amp; Matériaux</th>
        <th style="text-align: center;">Qté</th>
        <th style="text-align: center;">Unité</th>
        <th style="text-align: right;">Prix Unit. HT</th>
        <th style="text-align: right;">TVA BE</th>
        <th style="text-align: right;">Total HT</th>
      </tr>
    </thead>
    <tbody>
      ${data.lines
        .map(
          (l) => `
        <tr>
          <td>${escapeHtml(l.designation)}</td>
          <td style="text-align: center;">${formatAmount(l.qty)}</td>
          <td style="text-align: center;">${escapeHtml(l.unit)}</td>
          <td style="text-align: right;">${formatAmount(l.priceHt)} €</td>
          <td style="text-align: right;">${formatAmount(l.vatRate)} %</td>
          <td style="text-align: right; font-weight: bold;">${formatAmount(l.qty * l.priceHt)} €</td>
        </tr>
      `
        )
        .join("")}
    </tbody>
  </table>

  <div class="totals">
    <div><span>Total HT :</span> <span>${formatAmount(data.amountHt)} €</span></div>
    <div><span>TVA Belgique (${formatAmount(data.lines[0]?.vatRate ?? 6)}%) :</span> <span>+ ${formatAmount(data.vatAmount)} €</span></div>
    <div class="grand-total"><span>TOTAL TTC :</span> <span>${formatAmount(data.amountTtc)} €</span></div>
  </div>

  <div class="legal-footer">
    <p><strong>Mentions Légales Obligatoires Belges :</strong></p>
    <p>${escapeHtml(
      `${siteData.name} — ${siteData.fullAddress} — ${siteData.siret} — Capital ${siteData.capital} — RCS ${siteData.rcs} — TVA ${siteData.tvaIntra}`
    )}</p>
    <p>Conditions de règlement : Paiement à réception par virement bancaire. En cas de retard de paiement, une pénalité forfaitaire de 10% par an sera appliquée de plein droit sans mise en demeure préalable.</p>
    <p>Garantie Décennale couverte sous la loi du 31 mai 2017 pour les ouvrages de structure et d'étanchéité en Région Bruxelloise, Brabant Wallon et Wallonie.</p>
  </div>

</body>
</html>
  `;
}
