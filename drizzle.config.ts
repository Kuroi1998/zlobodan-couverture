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
export default {
  schema: "./src/db/schema/*",
  out: "./src/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.MIGRATION_DATABASE_URL ??
      process.env.DATABASE_URL ??
      "postgres://postgres:postgres@localhost:5432/zlobodan",
  },
} satisfies Config;
