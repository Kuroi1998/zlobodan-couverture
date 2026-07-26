/**
 * Diagnostic de configuration — `npm run env:check`.
 *
 * Vérifie la présence et le format des variables d'environnement sans jamais
 * afficher une seule valeur de secret. Sortie non nulle en cas d'erreur, pour
 * qu'un pipeline puisse s'arrêter dessus.
 *
 * Exécuté sous tsx avec `tsconfig.scripts.json`, qui neutralise `server-only`
 * (ces modules ne tournent alors pas dans un bundle Next mais en Node pur).
 */
import {
  describeEnvironment,
  getAppOrigin,
  getMigrationDatabaseUrl,
  getRedisConfig,
  getTurnstileSecret,
  maskDatabaseUrl,
  requireDatabaseUrl,
  requireIpHashSalt,
  requireSessionSecret,
} from "../src/config/env";

interface Check {
  name: string;
  run: () => string;
}

/** Chaque contrôle retourne une information non sensible, ou lève. */
const checks: Check[] = [
  { name: "DATABASE_URL", run: () => maskDatabaseUrl(requireDatabaseUrl()) },
  { name: "MIGRATION_DATABASE_URL", run: () => maskDatabaseUrl(getMigrationDatabaseUrl()) },
  { name: "APP_ORIGIN", run: () => getAppOrigin() },
  {
    name: "SESSION_SECRET",
    run: () => `${requireSessionSecret().length} caractères`,
  },
  { name: "IP_HASH_SALT", run: () => `${requireIpHashSalt().length} caractères` },
  {
    name: "TURNSTILE_SECRET_KEY",
    run: () => (getTurnstileSecret() ? "configurée" : "absente (dev — anti-automate non effectué)"),
  },
  {
    name: "UPSTASH_REDIS",
    run: () => (getRedisConfig() ? "configuré" : "absent (limitation locale par instance)"),
  },
];

function main(): void {
  const report = describeEnvironment();
  process.stdout.write(`Environnement : ${report.nodeEnv}\n\n`);

  let failures = 0;
  for (const check of checks) {
    try {
      process.stdout.write(`  ✓ ${check.name.padEnd(24)} ${check.run()}\n`);
    } catch (error) {
      failures += 1;
      const reason = error instanceof Error ? error.message : "erreur inconnue";
      process.stdout.write(`  ✗ ${check.name.padEnd(24)} ${reason}\n`);
    }
  }

  if (report.nodeEnv !== "production" && report.trustedProxy !== "cloudflare") {
    process.stdout.write(
      "\n  ⚠ TRUSTED_PROXY != cloudflare : l'IP cliente ne sera pas vérifiable en production.\n"
    );
  }

  if (failures > 0) {
    process.stdout.write(`\n✗ ${failures} variable(s) invalide(s).\n`);
    process.exit(1);
  }
  process.stdout.write("\n✓ Configuration d'environnement valide.\n");
}

main();
