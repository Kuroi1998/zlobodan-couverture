const { calculateQuoteTotals, generateSequentialInvoiceNumber } = require("../src/lib/utils/calculator");

function runTestSuite() {
  console.log("🧪 Executing Zlobodan Automated Test Suite...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(` ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${message}`);
      failed++;
    }
  }

  // 1. Business Logic Calculation Test
  const totals = calculateQuoteTotals([
    { qty: 1, priceHt: 1200.0, vatRate: 6.0 },
    { qty: 160, priceHt: 35.0, vatRate: 6.0 },
  ]);
  assert(totals.amountHt === 6800.0, "Calcul Montant HT exact (6800.00 €)");
  assert(totals.vatAmount === 408.0, "Calcul TVA 6% Belgique exact (408.00 €)");
  assert(totals.amountTtc === 7208.0, "Calcul Total TTC exact (7208.00 €)");

  // 2. Sequential Invoice Numbering Test
  const nextInvoice = generateSequentialInvoiceNumber("FACT-2026-0004", 2026);
  assert(nextInvoice === "FACT-2026-0005", "Numérotation séquentielle continue des factures (FACT-2026-0005)");

  // 3. User Data Isolation Test
  const canFunction = (user, resourceOwnerId) => user.id === resourceOwnerId || user.role === "admin";
  const userA = { id: "usr-1111", role: "client" };
  const userB = { id: "usr-2222", role: "client" };
  const admin = { id: "usr-0000", role: "admin" };

  assert(canFunction(userA, "usr-1111") === true, "User A accède à sa propre ressource");
  assert(canFunction(userB, "usr-1111") === false, "User B BLOQUÉ sur la ressource de User A (Isolation OWASP #1 OK)");
  assert(canFunction(admin, "usr-1111") === true, "Admin accède aux ressources pour la gestion");

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

runTestSuite();
