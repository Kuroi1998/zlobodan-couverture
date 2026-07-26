/**
 * Diagnostic de connexion PostgreSQL — `npm run db:check`.
 *
 * Effectue une **vraie requête** (`SELECT version(), current_database(),
 * current_user`), avec timeout, puis ferme proprement le pool. Sortie non
 * nulle en cas d'échec, message normalisé sans secret ni détail exploitable.
 *
 * Exécuté sous tsx avec `tsconfig.scripts.json` (neutralise `server-only`).
 */
import { checkDatabaseConnection, closeDatabase, describeDatabaseTarget } from "../src/db/diagnostics";

async function main(): Promise<void> {
  process.stdout.write(`Cible : ${describeDatabaseTarget()}\n`);

  const result = await checkDatabaseConnection();

  if (!result.ok) {
    process.stdout.write(`  ✗ ${result.error}\n`);
    if (result.errorCode) process.stdout.write(`    code : ${result.errorCode}\n`);
    await closeDatabase().catch(() => undefined);
    process.exit(1);
  }

  process.stdout.write("  ✓ Connexion établie\n");
  process.stdout.write(`  ✓ SELECT 1 réussi\n`);
  if (result.info) {
    process.stdout.write(`  ✓ Version   : ${result.info.serverVersion}\n`);
    process.stdout.write(`  ✓ Base      : ${result.info.database}\n`);
    process.stdout.write(`  ✓ Utilisateur : ${result.info.user}\n`);
  }

  await closeDatabase();
  process.stdout.write("\n✓ Base de données accessible.\n");
}

main().catch(async (error) => {
  // Filet de sécurité : toute erreur inattendue reste sans secret.
  process.stderr.write("✗ Échec du diagnostic de base de données.\n");
  process.stderr.write(`${error instanceof Error ? error.message : "erreur inconnue"}\n`);
  await closeDatabase().catch(() => undefined);
  process.exit(1);
});
