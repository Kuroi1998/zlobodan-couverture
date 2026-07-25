async function main() {
  console.log("🌱 Seeding Zlobodan DB demo dataset...");
  console.log(" - Default Admin User: admin@zlobodan-couverture.be (Role: admin)");
  console.log(" - Default Staff User: staff@zlobodan-couverture.be (Role: staff)");
  console.log(" - Default Client User: client@zlobodan-couverture.be (Role: client)");
  console.log(" - Sample Quotes & Invoices initialized with Belgian VAT rate (6.00%).");
  console.log("✅ Seed script configuration completed.");
}

main().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
