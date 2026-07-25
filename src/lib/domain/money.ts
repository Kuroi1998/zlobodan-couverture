/**
 * Arithmétique monétaire en centimes entiers.
 *
 * Le calcul précédent additionnait des flottants puis arrondissait à la fin.
 * Deux défauts, l'un technique, l'autre métier :
 *
 *  - `0.1 + 0.2 !== 0.3` en virgule flottante. Sur une centaine de lignes,
 *    l'écart devient visible sur une facture, et une facture qui ne tombe pas
 *    juste est un litige.
 *  - Aucun contrôle de signe : une ligne à -1000 € produisait une facture
 *    négative. Sur un devis accepté puis facturé, cela revient à se faire
 *    créditer.
 *
 * Tout se calcule ici en entiers de centimes. La conversion vers `NUMERIC(12,2)`
 * pour la base se fait au dernier moment.
 */

export class MoneyError extends Error {
  readonly reason: string;
  constructor(reason: string, message: string) {
    super(message);
    this.name = "MoneyError";
    this.reason = reason;
  }
}

/** Plafond de sécurité : 10 millions d'euros la ligne, très au-delà du métier. */
const MAX_CENTS = 1_000_000_000;
const MAX_QUANTITY = 100_000;

/** Taux de TVA belges applicables aux travaux de toiture. */
export const ALLOWED_VAT_RATES = [0, 6, 12, 21] as const;
export type VatRate = (typeof ALLOWED_VAT_RATES)[number];

export interface QuoteLineInput {
  qty: number;
  /** Prix unitaire hors taxe, en euros. */
  priceHt: number;
  vatRate: number;
}

export interface LineTotals {
  amountHtCents: number;
  vatAmountCents: number;
  amountTtcCents: number;
}

export interface DocumentTotals extends LineTotals {
  amountHt: number;
  vatAmount: number;
  amountTtc: number;
  /** Ventilation par taux, exigée sur une facture belge. */
  vatBreakdown: { rate: number; baseCents: number; vatCents: number }[];
}

/** Conversion euros → centimes, en refusant tout ce qui n'est pas un montant. */
export function toCents(euros: number): number {
  if (!Number.isFinite(euros)) {
    throw new MoneyError("not-finite", "Montant invalide.");
  }
  // `Math.round` après multiplication : 19.99 * 100 vaut 1998.9999… en flottant.
  const cents = Math.round(euros * 100);
  if (Math.abs(cents) > MAX_CENTS) {
    throw new MoneyError("out-of-range", "Montant hors des limites autorisées.");
  }
  return cents;
}

export function fromCents(cents: number): number {
  return Math.round(cents) / 100;
}

function assertLineIsSane(line: QuoteLineInput, index: number): void {
  const position = `ligne ${index + 1}`;

  if (!Number.isFinite(line.qty) || !Number.isFinite(line.priceHt)) {
    throw new MoneyError("not-finite", `Valeur numérique invalide (${position}).`);
  }
  // Refus des montants et quantités négatifs : sans ce contrôle, une ligne
  // négative transforme un devis en avoir déguisé. Un remboursement passe par
  // une note de crédit, jamais par une ligne négative.
  if (line.qty < 0 || line.priceHt < 0) {
    throw new MoneyError("negative", `Quantité et prix doivent être positifs (${position}).`);
  }
  if (line.qty > MAX_QUANTITY) {
    throw new MoneyError("out-of-range", `Quantité hors limites (${position}).`);
  }
  if (!ALLOWED_VAT_RATES.includes(line.vatRate as VatRate)) {
    throw new MoneyError(
      "invalid-vat-rate",
      `Taux de TVA non autorisé : ${line.vatRate} % (${position}). ` +
        `Attendu : ${ALLOWED_VAT_RATES.join(", ")}.`
    );
  }
}

/**
 * Total d'une ligne.
 *
 * **Convention d'arrondi retenue : ligne par ligne.** La TVA est arrondie au
 * centime sur chaque ligne, puis les lignes sont sommées. C'est la convention
 * usuelle en facturation belge et celle qui rend la facture vérifiable à la
 * main : chaque ligne affichée est exacte, et le total est la somme des lignes
 * affichées.
 *
 * L'alternative — arrondir seulement le total — donne un total exact mais des
 * lignes qui ne s'additionnent pas visuellement. Le choix doit être *unique*
 * dans toute l'application, sinon devis et facture divergent d'un centime.
 */
export function computeLineTotals(line: QuoteLineInput, index = 0): LineTotals {
  assertLineIsSane(line, index);

  const unitCents = toCents(line.priceHt);
  // La quantité peut être décimale (m², mètres linéaires) : on arrondit le
  // produit au centime.
  const amountHtCents = Math.round(unitCents * line.qty);
  const vatAmountCents = Math.round((amountHtCents * line.vatRate) / 100);

  if (amountHtCents > MAX_CENTS) {
    throw new MoneyError("out-of-range", `Total de ligne hors limites (ligne ${index + 1}).`);
  }

  return {
    amountHtCents,
    vatAmountCents,
    amountTtcCents: amountHtCents + vatAmountCents,
  };
}

export function computeDocumentTotals(lines: QuoteLineInput[]): DocumentTotals {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new MoneyError("empty", "Un document doit comporter au moins une ligne.");
  }
  if (lines.length > 500) {
    throw new MoneyError("too-many-lines", "Nombre de lignes excessif.");
  }

  const byRate = new Map<number, { baseCents: number; vatCents: number }>();
  let amountHtCents = 0;
  let vatAmountCents = 0;

  lines.forEach((line, index) => {
    const totals = computeLineTotals(line, index);
    amountHtCents += totals.amountHtCents;
    vatAmountCents += totals.vatAmountCents;

    const bucket = byRate.get(line.vatRate) ?? { baseCents: 0, vatCents: 0 };
    bucket.baseCents += totals.amountHtCents;
    bucket.vatCents += totals.vatAmountCents;
    byRate.set(line.vatRate, bucket);
  });

  const amountTtcCents = amountHtCents + vatAmountCents;

  return {
    amountHtCents,
    vatAmountCents,
    amountTtcCents,
    amountHt: fromCents(amountHtCents),
    vatAmount: fromCents(vatAmountCents),
    amountTtc: fromCents(amountTtcCents),
    vatBreakdown: Array.from(byRate.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rate, v]) => ({ rate, baseCents: v.baseCents, vatCents: v.vatCents })),
  };
}

/** Formatage pour la colonne `NUMERIC(12,2)` de PostgreSQL. */
export function centsToNumeric(cents: number): string {
  return (Math.round(cents) / 100).toFixed(2);
}
