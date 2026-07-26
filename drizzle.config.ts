import type { Config } from "drizzle-kit";

/**
 * Configuration des migrations Drizzle.
 *
 * `driver: "pg"` / `connectionString` était le format de drizzle-kit 0.20.
 * Ces clés ne sont plus reconnues depuis la 0.31, ce qui rendait
 * `npm run db:generate` inopérant après la montée de drizzle-orm en 0.45
 * (effectuée pour corriger l'injection SQL par identifiants).
 *
 * Rappel d'exploitation : ces commandes doivent s'exécuter avec le **compte de
 * migration**, distinct du compte applicatif — d'où la variable dédiée.
 * Voir `docs/runbook-infrastructure.md`, section PostgreSQL.
 */
/**
 * URL de migration, sans repli codé en dur.
 *
 * `drizzle-kit` est un outil CLI (Node) : il ne peut pas importer la
 * configuration `server-only` de l'application, d'où la lecture directe de
 * `process.env` ici. Le compte de migration, aux privilèges DDL, est distinct
 * du compte applicatif — voir le runbook.
 *
 * Aucune chaîne de connexion en dur : l'absence de variable échoue clairement
 * plutôt que de pointer silencieusement vers une base par défaut.
 */
const migrationUrl = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "[drizzle] MIGRATION_DATABASE_URL ou DATABASE_URL est requise. " +
      "Renseigner .env (voir .env.example) avant toute commande db:*."
  );
}

export default {
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url: migrationUrl },
} satisfies Config;
