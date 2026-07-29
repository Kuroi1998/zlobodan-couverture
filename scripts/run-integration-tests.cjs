const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const postgres = require("postgres");

function loadLocalEnvironment() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}

function deriveTestUrl() {
  const source = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
  if (!source) throw new Error("TEST_DATABASE_URL ou DATABASE_URL est requise.");
  const url = new URL(source);
  if (!["localhost", "127.0.0.1", "::1", "postgres", "db"].includes(url.hostname)) {
    throw new Error("La base de tests doit être locale ou être le service PostgreSQL de la CI.");
  }
  if (!process.env.TEST_DATABASE_URL) {
    const baseName = url.pathname.replace(/^\//, "");
    url.pathname = `/${baseName}_test`;
  }
  const databaseName = url.pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) {
    throw new Error("Le nom de la base isolée doit se terminer par _test.");
  }
  return url;
}

function runNode(args, env) {
  const result = spawnSync(process.execPath, args, {
    cwd: process.cwd(),
    env,
    stdio: "inherit",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

async function prepareDatabase(testUrl) {
  const databaseName = testUrl.pathname.replace(/^\//, "");
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    const rows = await admin`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;
    if (!rows[0]?.exists) {
      await admin.unsafe(`create database "${databaseName}"`);
    }
  } finally {
    await admin.end();
  }

  const testDb = postgres(testUrl.toString(), { max: 1 });
  try {
    await testDb`drop schema if exists public cascade`;
    await testDb`drop schema if exists drizzle cascade`;
    await testDb`create schema public`;
  } finally {
    await testDb.end();
  }
}

async function main() {
  loadLocalEnvironment();
  const testUrl = deriveTestUrl();
  await prepareDatabase(testUrl);

  const uploadDirectory = path.resolve(process.cwd(), ".tmp", "integration-uploads");
  const env = {
    ...process.env,
    NODE_ENV: "test",
    DATABASE_URL: testUrl.toString(),
    MIGRATION_DATABASE_URL: testUrl.toString(),
    TEST_DATABASE_URL: testUrl.toString(),
    UPLOAD_STORAGE_DRIVER: "local",
    LOCAL_UPLOAD_DIRECTORY: uploadDirectory,
    NOTIFICATION_ADMIN_EMAIL: "demandes@example.test",
  };
  runNode(
    [
      "node_modules/tsx/dist/cli.mjs",
      "--tsconfig",
      "tsconfig.scripts.json",
      "scripts/migrate-database.ts",
    ],
    env
  );
  runNode(
    ["node_modules/vitest/vitest.mjs", "run", "--config", "vitest.integration.config.mts"],
    env
  );
}

main().catch((error) => {
  process.stderr.write(
    `Tests d'intégration impossibles : ${error instanceof Error ? error.message : "erreur inconnue"}\n`
  );
  process.exit(1);
});
