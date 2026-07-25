import { computeDocumentTotals, type QuoteLineInput } from "@/lib/domain/money";

/**
 * Calculs commerciaux.
 *
 * Ce module ne fait plus que déléguer : toute l'arithmétique vit dans
 * `lib/domain/money.ts`, en centimes entiers.
 *
 * `generateSequentialInvoiceNumber()` a été **supprimée**. Elle dérivait le
 * numéro suivant d'un `lastNumber` lu hors transaction : deux facturations
 * simultanées obtenaient le même numéro. Elle acceptait de surcroît n'importe
 * quelle chaîne — `parseInt("abc") + 1` produisait `FACT-2026-NaN`.
 * La numérotation passe désormais par une séquence PostgreSQL
 * (`lib/db/numbering.ts`), dont l'incrément est atomique.
 */

export function calculateQuoteTotals(lines: QuoteLineInput[]) {
  const totals = computeDocumentTotals(lines);
  return {
    amountHt: totals.amountHt,
    vatAmount: totals.vatAmount,
    amountTtc: totals.amountTtc,
  };
}

export { computeDocumentTotals, computeLineTotals } from "@/lib/domain/money";
