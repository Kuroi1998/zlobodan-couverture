import { describe, expect, test } from "vitest";
import { calculateQuoteTotals } from "@/domain/money";
import { formatDocumentNumber, NUMBERING_SEQUENCES } from "@/lib/db/numbering";

describe("Calculs commerciaux", () => {
  test("Calcul exact des montants HT, TVA 6% Belgique et TTC", () => {
    const totals = calculateQuoteTotals([
      { qty: 1, priceHt: 1200.0, vatRate: 6.0 },
      { qty: 160, priceHt: 35.0, vatRate: 6.0 },
    ]);

    expect(totals.amountHt).toBe(6800.0);
    expect(totals.vatAmount).toBe(408.0);
    expect(totals.amountTtc).toBe(7208.0);
  });
});

describe("Numérotation des documents", () => {
  /**
   * `generateSequentialInvoiceNumber(lastNumber, year)` a été supprimée : elle
   * dérivait le numéro d'une valeur lue hors transaction, donc deux
   * facturations simultanées obtenaient le même. Le test correspondant
   * validait précisément le comportement vulnérable.
   *
   * Il ne reste ici que le formatage, qui est une fonction pure. L'unicité
   * repose désormais sur `nextval()`, garantie par PostgreSQL et non par du
   * code applicatif — elle se vérifie en intégration, pas en test unitaire.
   */
  test("le formatage respecte le format comptable belge", () => {
    expect(formatDocumentNumber("invoice", 2026, 5)).toBe("FACT-2026-0005");
    expect(formatDocumentNumber("quote", 2026, 12)).toBe("DEV-2026-0012");
    expect(formatDocumentNumber("credit_note", 2026, 1)).toBe("AV-2026-0001");
  });

  test("le rembourrage tient au-delà de quatre chiffres", () => {
    expect(formatDocumentNumber("invoice", 2026, 12345)).toBe("FACT-2026-12345");
  });

  test("les noms de séquence sont une table constante, jamais une entrée", () => {
    expect(Object.values(NUMBERING_SEQUENCES)).toEqual([
      "seq_invoice_number",
      "seq_quote_number",
      "seq_credit_note_number",
    ]);
  });
});
