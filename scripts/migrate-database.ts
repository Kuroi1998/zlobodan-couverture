import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

const migrationsFolder = path.resolve(process.cwd(), "src/db/migrations");
const journalPath = path.join(migrationsFolder, "meta", "_journal.json");
const baselinePath = path.join(migrationsFolder, "0000_tiny_the_spike.sql");

interface Journal {
  entries: Array<{ tag: string; when: number }>;
}

const requiredBaselineTables = [
  "users",
  "sessions",
  "quote_requests",
  "quotes",
  "quote_lines",
  "invoices",
  "projects",
  "documents",
  "messages",
  "audit_log",
] as const;

async function baselineExistingDatabase(sql: postgres.Sql): Promise<void> {
  const [state] = await sql<[{ migrationTable: string | null; usersTable: string | null }]>`
    select
      to_regclass('drizzle.__drizzle_migrations')::text as "migrationTable",
      to_regclass('public.users')::text as "usersTable"
  `;
  if (state?.migrationTable || !state?.usersTable) return;

  const tables = await sql<{ table_name: string }[]>`
    select table_name
    from information_schema.tables
    where table_schema = 'public'
      and table_name = any(${sql.array([...requiredBaselineTables])})
  `;
  const existing = new Set(tables.map((row) => row.table_name));
  const missing = requiredBaselineTables.filter((table) => !existing.has(table));
  if (missing.length > 0) {
    throw new Error(
      `Base existante partielle : migration automatique refusée (${missing.length} table(s) manquante(s)).`
    );
  }

  const journal = JSON.parse(fs.readFileSync(journalPath, "utf8")) as Journal;
  const baselineEntry = journal.entries.find((entry) => entry.tag === "0000_tiny_the_spike");
  if (!baselineEntry) throw new Error("Entrée de migration initiale introuvable.");
  const hash = crypto.createHash("sha256").update(fs.readFileSync(baselinePath)).digest("hex");

  await sql.begin(async (transaction) => {
    await transaction`create schema if not exists drizzle`;
    await transaction`
      create table if not exists drizzle.__drizzle_migrations (
        id serial primary key,
        hash text not null,
        created_at bigint
      )
    `;
    await transaction`
      insert into drizzle.__drizzle_migrations (hash, created_at)
      values (${hash}, ${baselineEntry.when})
    `;
  });
}

async function main(): Promise<void> {
  const url = process.env.MIGRATION_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!url) throw new Error("MIGRATION_DATABASE_URL ou DATABASE_URL est requise.");

  const client = postgres(url, { max: 1 });
  try {
    await baselineExistingDatabase(client);
    await migrate(drizzle(client), { migrationsFolder });
    process.stdout.write("✓ Migrations PostgreSQL appliquées.\n");
  } finally {
    await client.end();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "erreur inconnue";
  process.stderr.write(`✗ Migration PostgreSQL impossible : ${message}\n`);
  process.exit(1);
});
