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
    throw new Error("La preuve de redémarrage exige une base locale isolée.");
  }
  if (!process.env.E2E_DATABASE_URL) {
    const baseName = url.pathname.replace(/^\//, "").replace(/_test$/, "");
    url.pathname = `/${baseName}_e2e_test`;
  }
  const databaseName = url.pathname.replace(/^\//, "");
  if (!/^[a-zA-Z0-9_]+_test$/.test(databaseName)) {
    throw new Error("La base de redémarrage doit se terminer par _test.");
  }
  return url;
}

async function assertPreviousRunExists(databaseUrl) {
  const sql = postgres(databaseUrl.toString(), { max: 1 });
  try {
    const rows = await sql`
      select
        (select count(*)::int from contact_messages) as contacts,
        (select count(*)::int from quote_requests where status <> 'draft') as requests,
        (select count(*)::int from quote_attachments) as attachments
    `;
    const counts = rows[0];
    if (
      !counts ||
      counts.contacts < 1 ||
      counts.requests < 2 ||
      counts.attachments < 2
    ) {
      throw new Error(
        "Les données du premier serveur manquent. Exécuter npm run test:e2e avant cette preuve."
      );
    }
  } finally {
    await sql.end();
  }
}

function runPlaywright(env) {
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/playwright/cli.js",
      "test",
      "--config",
      "playwright.restart.config.ts",
    ],
    {
      cwd: process.cwd(),
      env,
      stdio: "inherit",
    }
  );
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`La preuve après redémarrage a échoué (${result.status ?? 1}).`);
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

async function main() {
  loadLocalEnvironment();
  const testUrl = deriveE2eUrl();
  await assertPreviousRunExists(testUrl);
  const nextEnvPath = path.resolve(process.cwd(), "next-env.d.ts");
  const originalNextEnv = fs.readFileSync(nextEnvPath, "utf8");
  const env = {
    ...process.env,
    NODE_ENV: "development",
    APP_ORIGIN: "http://127.0.0.1:3101",
    DATABASE_URL: testUrl.toString(),
    E2E_DATABASE_URL: testUrl.toString(),
    NEXT_DIST_DIR: ".next-restart",
    UPLOAD_STORAGE_DRIVER: "local",
    LOCAL_UPLOAD_DIRECTORY: path.resolve(process.cwd(), ".tmp", "e2e-uploads"),
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: "",
    TURNSTILE_SECRET_KEY: "",
    VERIFY_RESTART_PERSISTENCE: "true",
  };
  try {
    runPlaywright(env);
  } finally {
    restoreFileWithRetry(nextEnvPath, originalNextEnv);
  }
}

main().catch((error) => {
  process.stderr.write(
    `Preuve de redémarrage impossible : ${
      error instanceof Error ? error.message : "erreur inconnue"
    }\n`
  );
  process.exit(1);
});
