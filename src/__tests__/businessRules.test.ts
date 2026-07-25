import { describe, expect, test } from "vitest";
import {
  computeDocumentTotals,
  computeLineTotals,
  MoneyError,
  toCents,
  fromCents,
  centsToNumeric,
} from "@/domain/money";
import {
  assertInvoiceTransition,
  assertQuoteTransition,
  canTransitionInvoice,
  canTransitionQuote,
  isQuoteAcceptable,
  isQuoteMutable,
  TransitionError,
} from "@/domain/state-machine";
import {
  NEVER_USER_WRITABLE,
  pickAllowedFields,
  ProfileUpdateSchema,
} from "@/lib/security/mass-assignment";
import { escapeCsvField, neutralizeCsvCell, toCsv } from "@/lib/security/csv";

describe("Montants — arithmétique en centimes", () => {
  test("aucune dérive de virgule flottante sur un cumul de lignes", () => {
    // 0.1 + 0.2 !== 0.3 en flottant. Répété, l'écart devient visible.
    const lines = Array.from({ length: 100 }, () => ({ qty: 1, priceHt: 0.1, vatRate: 21 }));
    const totals = computeDocumentTotals(lines);
    expect(totals.amountHtCents).toBe(1000);
    expect(totals.amountHt).toBe(10);
  });

  test("conversion euros/centimes exacte sur les cas piégeux", () => {
    expect(toCents(19.99)).toBe(1999);
    expect(toCents(0.07)).toBe(7);
    expect(toCents(1234.56)).toBe(123456);
    expect(fromCents(123456)).toBe(1234.56);
    expect(centsToNumeric(123456)).toBe("1234.56");
  });

  /**
   * Non-régression : sans contrôle de signe, une ligne à -1000 € transforme un
   * devis en avoir déguisé, et la facture qui en découle est négative.
   */
  test("une quantité ou un prix négatif est refusé", () => {
    expect(() => computeLineTotals({ qty: -1, priceHt: 1000, vatRate: 6 })).toThrow(MoneyError);
    expect(() => computeLineTotals({ qty: 1, priceHt: -1000, vatRate: 6 })).toThrow(MoneyError);
    expect(() => computeDocumentTotals([{ qty: 1, priceHt: -1000, vatRate: 6 }])).toThrow(
      /positifs/
    );
  });

  test("un taux de TVA hors barème belge est refusé", () => {
    expect(() => computeLineTotals({ qty: 1, priceHt: 100, vatRate: 7 })).toThrow(/TVA/);
    expect(() => computeLineTotals({ qty: 1, priceHt: 100, vatRate: 6 })).not.toThrow();
    expect(() => computeLineTotals({ qty: 1, priceHt: 100, vatRate: 21 })).not.toThrow();
  });

  test("les valeurs non finies et hors limites sont refusées", () => {
    expect(() => computeLineTotals({ qty: NaN, priceHt: 10, vatRate: 6 })).toThrow(MoneyError);
    expect(() => computeLineTotals({ qty: Infinity, priceHt: 10, vatRate: 6 })).toThrow(MoneyError);
    expect(() => computeLineTotals({ qty: 1, priceHt: 1e12, vatRate: 6 })).toThrow(MoneyError);
  });

  test("l'arrondi de TVA est fait ligne par ligne, de façon reproductible", () => {
    // 33.33 € à 21 % => 6.9993 € => 7.00 € arrondi à la ligne.
    const single = computeLineTotals({ qty: 1, priceHt: 33.33, vatRate: 21 });
    expect(single.vatAmountCents).toBe(700);

    // Trois lignes identiques : la somme des lignes arrondies, pas l'arrondi
    // de la somme. Le total affiché doit être la somme des lignes affichées.
    const totals = computeDocumentTotals([
      { qty: 1, priceHt: 33.33, vatRate: 21 },
      { qty: 1, priceHt: 33.33, vatRate: 21 },
      { qty: 1, priceHt: 33.33, vatRate: 21 },
    ]);
    expect(totals.vatAmountCents).toBe(2100);
    expect(totals.amountTtcCents).toBe(9999 + 2100);
  });

  test("la ventilation par taux est produite pour la facture", () => {
    const totals = computeDocumentTotals([
      { qty: 1, priceHt: 100, vatRate: 6 },
      { qty: 1, priceHt: 100, vatRate: 21 },
    ]);
    expect(totals.vatBreakdown).toEqual([
      { rate: 6, baseCents: 10000, vatCents: 600 },
      { rate: 21, baseCents: 10000, vatCents: 2100 },
    ]);
  });

  test("un document sans ligne est refusé", () => {
    expect(() => computeDocumentTotals([])).toThrow(MoneyError);
  });
});

describe("Machine à états — devis", () => {
  test("le parcours nominal est autorisé", () => {
    expect(canTransitionQuote("draft", "sent")).toBe(true);
    expect(canTransitionQuote("sent", "accepted")).toBe(true);
    expect(canTransitionQuote("sent", "refused")).toBe(true);
  });

  /**
   * Non-régression sur la double acceptation : `accepted` étant terminal, un
   * second clic ne peut pas rejouer la transition qui déclenche la facturation.
   */
  test("un devis accepté ou refusé est terminal", () => {
    for (const target of ["sent", "accepted", "refused", "draft", "expired"]) {
      expect(canTransitionQuote("accepted", target)).toBe(false);
      expect(canTransitionQuote("refused", target)).toBe(false);
    }
  });

  test("on ne peut pas accepter un devis expiré", () => {
    const hier = new Date(Date.now() - 86400000);
    const demain = new Date(Date.now() + 86400000);
    expect(isQuoteAcceptable("sent", demain)).toBe(true);
    expect(isQuoteAcceptable("sent", hier)).toBe(false);
    expect(isQuoteAcceptable("accepted", demain)).toBe(false);
  });

  test("un devis n'est modifiable qu'à l'état brouillon", () => {
    expect(isQuoteMutable("draft")).toBe(true);
    expect(isQuoteMutable("sent")).toBe(false);
    expect(isQuoteMutable("accepted")).toBe(false);
  });

  test("un état inconnu est refusé plutôt qu'ignoré", () => {
    expect(canTransitionQuote("nimportequoi", "accepted")).toBe(false);
    expect(canTransitionQuote("sent", "admin")).toBe(false);
    expect(() => assertQuoteTransition("accepted", "sent")).toThrow(TransitionError);
  });
});

describe("Machine à états — factures", () => {
  test("une facture payée ne peut plus être annulée", () => {
    expect(canTransitionInvoice("paid", "cancelled")).toBe(false);
    expect(canTransitionInvoice("paid", "issued")).toBe(false);
    expect(() => assertInvoiceTransition("paid", "cancelled")).toThrow(TransitionError);
  });

  test("le parcours de recouvrement reste ouvert", () => {
    expect(canTransitionInvoice("issued", "overdue")).toBe(true);
    expect(canTransitionInvoice("overdue", "paid")).toBe(true);
    expect(canTransitionInvoice("issued", "cancelled")).toBe(true);
  });

  test("une facture annulée est terminale", () => {
    expect(canTransitionInvoice("cancelled", "issued")).toBe(false);
    expect(canTransitionInvoice("cancelled", "paid")).toBe(false);
  });
});

describe("Affectation en masse", () => {
  test("les champs d'élévation de privilège sont refusés", () => {
    const attempt = {
      phone: "02 345 67 89",
      role: "admin",
      emailVerifiedAt: new Date().toISOString(),
      id: "usr-0000",
    };
    // `.strict()` fait échouer la validation au lieu de retirer en silence :
    // la tentative devient visible et journalisable.
    expect(ProfileUpdateSchema.safeParse(attempt).success).toBe(false);
  });

  test("une mise à jour légitime passe", () => {
    const result = ProfileUpdateSchema.safeParse({ phone: "02 345 67 89" });
    expect(result.success).toBe(true);
  });

  test("le filtre générique ne recopie que les champs déclarés", () => {
    const { value, rejected } = pickAllowedFields<{ phone: string }>(
      { phone: "0470000000", role: "admin", __proto__: { x: 1 } },
      ["phone"]
    );
    expect(value).toEqual({ phone: "0470000000" });
    expect(rejected).toContain("role");
    expect(Object.keys(value)).not.toContain("role");
  });

  test("la liste des champs jamais modifiables couvre les colonnes sensibles", () => {
    for (const field of ["role", "id", "emailVerifiedAt", "passwordHash", "createdAt"]) {
      expect(NEVER_USER_WRITABLE).toContain(field);
    }
  });
});

describe("Export CSV — injection de formule", () => {
  test("les amorces de formule sont neutralisées", () => {
    for (const payload of [
      "=cmd|'/c calc'!A1",
      "+1+1",
      "-1+1",
      "@SUM(A1:A9)",
      "=HYPERLINK(\"http://attaquant.example\")",
    ]) {
      const cell = neutralizeCsvCell(payload);
      expect(cell.startsWith("'")).toBe(true);
      // La valeur reste intégralement lisible pour l'utilisateur.
      expect(cell.slice(1)).toBe(payload);
    }
  });

  test("le bruit de tête ne permet pas de contourner la neutralisation", () => {
    // Le tableur ignore tabulations et retours avant le premier caractère.
    expect(neutralizeCsvCell("\t=1+1").startsWith("'")).toBe(true);
    expect(neutralizeCsvCell("\r=1+1").startsWith("'")).toBe(true);
    expect(neutralizeCsvCell(" =1+1").startsWith("'")).toBe(true);
  });

  test("une valeur ordinaire n'est pas altérée", () => {
    expect(neutralizeCsvCell("Jean Peeters")).toBe("Jean Peeters");
    expect(neutralizeCsvCell("1050 Ixelles")).toBe("1050 Ixelles");
    expect(neutralizeCsvCell("")).toBe("");
    expect(neutralizeCsvCell(null)).toBe("");
  });

  test("les séparateurs et guillemets sont échappés selon la RFC 4180", () => {
    expect(escapeCsvField('Dupont; "Le Toit"')).toBe('"Dupont; ""Le Toit"""');
    expect(escapeCsvField("ligne1\r\nligne2")).toContain('"');
  });

  test("la sérialisation complète reste sûre de bout en bout", () => {
    const csv = toCsv(
      [{ nom: "=1+1", ville: "Ixelles" }],
      [
        { header: "Nom", value: (r) => r.nom },
        { header: "Ville", value: (r) => r.ville },
      ]
    );
    expect(csv).toContain("'=1+1");
    expect(csv).not.toMatch(/(^|;)=1\+1/m);
  });
});
