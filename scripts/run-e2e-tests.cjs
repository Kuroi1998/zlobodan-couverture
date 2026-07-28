const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const postgres = require("postgres");

function loadLocalEnvironment() {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
}

function deriveE2eUrl() {
  const source =
    process.env.E2E_DATABASE_URL ||
    process.env.TEST_DATABASE_URL ||
    process.env.DATABASE_URL;
  if (!source) throw new Error("DATABASE_URL est requise.");
  const url = new URL(source);
  const allowedHosts = ["localhost", "127.0.0.1", "::1", "postgres", "db"];
  if (!allowedHosts.includes(url.hostname)) {
    throw new Error("La base E2E doit être locale ou appartenir au service PostgreSQL de CI.");
  }
  if (!process.env.E2E_DATABASE_URL) {
    const baseName = url.pathname.replace(/^\//, "").replace(/_test$/, "");
    url.pathname = `/${baseName}_e2e_test`;
  }
  const databaseName = url.pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) {
    throw new Error("Le nom de la base E2E doit se terminer par _test.");
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
  if (result.status !== 0) {
    const error = new Error(`La commande E2E a échoué avec le code ${result.status ?? 1}.`);
    error.exitCode = result.status ?? 1;
    throw error;
  }
}

function restoreFileWithRetry(filePath, contents) {
  let lastError;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      fs.writeFileSync(filePath, contents, "utf8");
      return;
    } catch (error) {
      lastError = error;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
  throw lastError;
}

async function resetDatabase(testUrl) {
  const databaseName = testUrl.pathname.replace(/^\//, "");
  const adminUrl = new URL(testUrl);
  adminUrl.pathname = "/postgres";
  const admin = postgres(adminUrl.toString(), { max: 1 });
  try {
    const rows = await admin`
      select exists(select 1 from pg_database where datname = ${databaseName}) as exists
    `;
    if (!rows[0]?.exists) await admin.unsafe(`create database "${databaseName}"`);
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
  const testUrl = deriveE2eUrl();
  await resetDatabase(testUrl);
  const uploadDirectory = path.resolve(process.cwd(), ".tmp", "e2e-uploads");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    APP_ORIGIN: "http://127.0.0.1:3100",
    DATABASE_URL: testUrl.toString(),
    MIGRATION_DATABASE_URL: testUrl.toString(),
    E2E_DATABASE_URL: testUrl.toString(),
    NEXT_DIST_DIR: ".next-e2e",
    UPLOAD_STORAGE_DRIVER: "local",
    LOCAL_UPLOAD_DIRECTORY: uploadDirectory,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    TRUSTED_PROXY: "cloudflare",
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
    [
      "node_modules/tsx/dist/cli.mjs",
      "--tsconfig",
      "tsconfig.scripts.json",
      "scripts/seed-e2e.ts",
    ],
    env
  );
  const nextEnvPath = path.resolve(process.cwd(), "next-env.d.ts");
  const originalNextEnv = fs.readFileSync(nextEnvPath, "utf8");
  try {
    runNode(
      ["node_modules/playwright/cli.js", "test", ...process.argv.slice(2)],
      env
    );
  } finally {
    restoreFileWithRetry(nextEnvPath, originalNextEnv);
  }
}

main().catch((error) => {
  process.stderr.write(
    `Tests E2E impossibles : ${error instanceof Error ? error.message : "erreur inconnue"}\n`
  );
  process.exit(error && Number.isInteger(error.exitCode) ? error.exitCode : 1);
});
