import { describe, expect, test } from "vitest";
import { calculateQuoteTotals, generateSequentialInvoiceNumber } from "@/lib/utils/calculator";

describe("Business Logic Unit Tests - Zlobodan Belgique", () => {
  test("Calcul exact des montants HT, TVA 6% Belgique et TTC", () => {
    const lines = [
      { qty: 1, priceHt: 1200.0, vatRate: 6.0 },
      { qty: 160, priceHt: 35.0, vatRate: 6.0 },
    ];

    const totals = calculateQuoteTotals(lines);

    // 1200 + (160 * 35) = 1200 + 5600 = 6800 € HT
    expect(totals.amountHt).toBe(6800.0);
    // 6800 * 0.06 = 408 € TVA
    expect(totals.vatAmount).toBe(408.0);
    // 6800 + 408 = 7208 € TTC
    expect(totals.amountTtc).toBe(7208.0);
  });

  test("Génération séquentielle continue des numéros de facture sans trou", () => {
    const lastNumber = "FACT-2026-0004";
    const nextNumber = generateSequentialInvoiceNumber(lastNumber, 2026);
    expect(nextNumber).toBe("FACT-2026-0005");
  });
});
