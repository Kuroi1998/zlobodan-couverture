import "server-only";
import { z } from "zod";
import {
  getPrivateStorageConfig,
  getSmtpConfig,
  type PrivateStorageConfig,
  type SmtpConfig,
} from "./service-env";

export { getPrivateStorageConfig, getSmtpConfig } from "./service-env";
export type { PrivateStorageConfig, SmtpConfig } from "./service-env";

/**
 * Source de vérité unique des variables d'environnement **serveur**.
 *
 * `import "server-only"` est une garde de compilation : si ce module venait à
 * être tiré dans le bundle navigateur — via un composant `"use client"` ou un
 * module partagé — le build échouerait. C'est une barrière que le scan runtime
 * de `scripts/check-client-bundle.js` ne pouvait pas offrir.
 *
 * Trois principes hérités de l'audit H8 et conservés :
 *  - un secret n'a jamais de valeur par défaut en production ;
 *  - son absence interrompt le démarrage plutôt que de dégrader une protection
 *    en silence ;
 *  - aucun message d'erreur ne contient la valeur d'un secret.
 *
 * `next build` évalue les modules pour collecter les routes sans servir de
 * trafic : exiger les secrets à ce moment casserait la compilation en CI. La
 * garde stricte ne s'applique donc qu'au serveur *en fonctionnement*
 * (`instrumentation.ts` la déclenche avant la première requête).
 */

const MIN_SECRET_LENGTH = 32;

/** Clé secrète de test Cloudflare : elle valide tout jeton, donc interdite en production. */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

const DEV_DATABASE_URL = "postgres://postgres:postgres@localhost:5432/zlobodan";
const DEV_APP_ORIGIN = "http://localhost:3000";

export type NodeEnvironment = "development" | "test" | "production";

function nodeEnv(): NodeEnvironment {
  const value = process.env.NODE_ENV;
  if (value === "production" || value === "test") return value;
  return "development";
}

function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

/** Vrai uniquement pour un serveur de production réellement en service. */
function isRuntimeProduction(): boolean {
  return nodeEnv() === "production" && !isBuildPhase();
}

function fail(variable: string, reason: string): never {
  throw new Error(
    `[env] ${variable} : ${reason}. Démarrage interrompu volontairement — ` +
      "voir docs/runbook-infrastructure.md et .env.example."
  );
}

// ---------------------------------------------------------------------------
// Validateurs de format — Zod, messages sans valeur sensible
// ---------------------------------------------------------------------------

const PostgresUrlSchema = z
  .string()
  .refine((v) => /^postgres(ql)?:\/\//.test(v), "schéma de connexion PostgreSQL attendu");

const SslModeSchema = z
  .string()
  .refine(
    (v) => /[?&]sslmode=(require|verify-ca|verify-full)/.test(v),
    "sslmode=require (ou verify-ca/verify-full) manquant : le chiffrement en transit est obligatoire en production"
  );

/** Lecture d'un secret obligatoire en production, avec repli explicite en dev/test. */
function readSecret(name: string, devFallback: string): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    if (isRuntimeProduction()) fail(name, "absente alors qu'elle est obligatoire en production");
    return devFallback;
  }
  if (isRuntimeProduction() && value.length < MIN_SECRET_LENGTH) {
    fail(name, `trop courte (${value.length} caractères, minimum ${MIN_SECRET_LENGTH})`);
  }
  return value;
}

// ---------------------------------------------------------------------------
// Accesseurs — une seule implémentation par variable
// ---------------------------------------------------------------------------

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "postgres", "db"]);

/** Hôte de confiance pour une base de **test** : local ou service CI conteneurisé. */
function isTestSafeHost(rawUrl: string): boolean {
  try {
    return LOOPBACK_HOSTS.has(new URL(rawUrl).hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function requireDatabaseUrl(): string {
  // Garde base-de-test : en mode test, on n'accepte qu'une base isolée. Une
  // `TEST_DATABASE_URL` explicite prime ; à défaut, `DATABASE_URL` doit pointer
  // vers un hôte local (ou le service CI). Cela empêche une suite de tests
  // d'écrire par accident dans une base réelle — la détection repose sur l'hôte,
  // pas sur la présence fragile du mot « production » dans l'URL.
  if (nodeEnv() === "test") {
    const testUrl = process.env.TEST_DATABASE_URL?.trim();
    if (testUrl) {
      if (!PostgresUrlSchema.safeParse(testUrl).success) {
        fail("TEST_DATABASE_URL", "schéma de connexion PostgreSQL attendu");
      }
      if (!isTestSafeHost(testUrl)) fail("TEST_DATABASE_URL", "hôte non local interdit en test");
      return testUrl;
    }
    const dbUrl = process.env.DATABASE_URL?.trim();
    if (dbUrl && !isTestSafeHost(dbUrl)) {
      fail(
        "DATABASE_URL",
        "hôte non local en mode test : fournir TEST_DATABASE_URL vers une base isolée"
      );
    }
    return dbUrl || DEV_DATABASE_URL;
  }

  const value = process.env.DATABASE_URL;

  if (!value || value.trim().length === 0) {
    if (isRuntimeProduction()) fail("DATABASE_URL", "absente");
    return DEV_DATABASE_URL;
  }
  const scheme = PostgresUrlSchema.safeParse(value);
  if (!scheme.success) fail("DATABASE_URL", scheme.error.issues[0].message);

  if (isRuntimeProduction()) {
    const ssl = SslModeSchema.safeParse(value);
    if (!ssl.success) fail("DATABASE_URL", ssl.error.issues[0].message);
  }
  return value;
}

/**
 * URL du compte de **migration**, aux privilèges DDL distincts du compte
 * applicatif. Retombe sur `DATABASE_URL` si non fournie — utile en dev où un
 * seul compte suffit.
 */
export function getMigrationDatabaseUrl(): string {
  const value = process.env.MIGRATION_DATABASE_URL;
  if (value && value.trim().length > 0) {
    const scheme = PostgresUrlSchema.safeParse(value);
    if (!scheme.success) fail("MIGRATION_DATABASE_URL", scheme.error.issues[0].message);
    return value;
  }
  return requireDatabaseUrl();
}

export function requireIpHashSalt(): string {
  return readSecret("IP_HASH_SALT", "dev-only-salt-not-for-production-use-0000");
}

export function requireSessionSecret(): string {
  return readSecret("SESSION_SECRET", "dev-only-session-secret-not-for-production");
}

export function getAppOrigin(): string {
  const value = process.env.APP_ORIGIN?.trim();
  if (value) {
    try {
      return new URL(value).origin;
    } catch {
      fail("APP_ORIGIN", "URL invalide");
    }
  }
  if (isRuntimeProduction()) fail("APP_ORIGIN", "absente");
  return DEV_APP_ORIGIN;
}

export type TrustedProxyMode = "cloudflare" | "none";

export function getTrustedProxyMode(): TrustedProxyMode {
  return process.env.TRUSTED_PROXY === "cloudflare" ? "cloudflare" : "none";
}

/**
 * Secret Turnstile. `null` quand l'anti-automate n'est pas configuré en dev :
 * l'appelant doit alors traiter la vérification comme *non effectuée*, jamais
 * comme réussie. En production, l'absence ou la clé de test arrête le démarrage.
 */
export function getTurnstileSecret(): string | null {
  // Une chaîne vide vaut absence : sinon un `TURNSTILE_SECRET_KEY=` dans le
  // `.env` serait pris pour une configuration valide.
  const value = process.env.TURNSTILE_SECRET_KEY?.trim() || null;

  if (isRuntimeProduction()) {
    if (!value) fail("TURNSTILE_SECRET_KEY", "absente");
    if (value === TURNSTILE_TEST_SECRET) {
      fail("TURNSTILE_SECRET_KEY", "clé de test Cloudflare : elle valide tous les jetons");
    }
    return value;
  }
  return value;
}

export interface RedisConfig {
  url: string;
  token: string;
}

/** Configuration Upstash, ou `null` si la limitation de débit reste locale. */
export function getRedisConfig(): RedisConfig | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ""), token };
}

// ---------------------------------------------------------------------------
// Journalisation sûre
// ---------------------------------------------------------------------------

/**
 * Rend une URL PostgreSQL journalisable : hôte, port et base seulement, jamais
 * l'utilisateur ni le mot de passe. Une URL illisible devient `<invalide>`
 * plutôt que d'être affichée telle quelle.
 */
export function maskDatabaseUrl(rawUrl: string): string {
  try {
    const url = new URL(rawUrl);
    const db = url.pathname.replace(/^\//, "") || "?";
    return `${url.hostname}:${url.port || "5432"}/${db}`;
  } catch {
    return "<invalide>";
  }
}

// ---------------------------------------------------------------------------
// Instantané gelé + diagnostic
// ---------------------------------------------------------------------------

export interface ServerEnv {
  readonly nodeEnv: NodeEnvironment;
  readonly databaseUrl: string;
  readonly appOrigin: string;
  readonly trustedProxy: TrustedProxyMode;
  readonly ipHashSalt: string;
  readonly sessionSecret: string;
  readonly turnstileSecret: string | null;
  readonly redis: RedisConfig | null;
  readonly privateStorage: PrivateStorageConfig;
  readonly smtp: SmtpConfig | null;
}

let cachedServerEnv: Readonly<ServerEnv> | null = null;

/**
 * Instantané validé, résolu une fois et **gelé** : la configuration ne peut
 * plus être mutée en cours d'exécution. C'est la forme « objet » de la source
 * de vérité, pour les appelants qui préfèrent lire des champs.
 */
export function getServerEnv(): Readonly<ServerEnv> {
  if (cachedServerEnv) return cachedServerEnv;
  cachedServerEnv = Object.freeze({
    nodeEnv: nodeEnv(),
    databaseUrl: requireDatabaseUrl(),
    appOrigin: getAppOrigin(),
    trustedProxy: getTrustedProxyMode(),
    ipHashSalt: requireIpHashSalt(),
    sessionSecret: requireSessionSecret(),
    turnstileSecret: getTurnstileSecret(),
    redis: getRedisConfig(),
    privateStorage: getPrivateStorageConfig(),
    smtp: getSmtpConfig(),
  });
  return cachedServerEnv;
}

const EnvReportSchema = z.object({
  nodeEnv: z.string(),
  hasDatabaseUrl: z.boolean(),
  hasIpHashSalt: z.boolean(),
  hasSessionSecret: z.boolean(),
  hasAppOrigin: z.boolean(),
  hasTurnstile: z.boolean(),
  hasDistributedRateLimit: z.boolean(),
  privateStorageDriver: z.enum(["local", "s3"]),
  hasSmtp: z.boolean(),
  trustedProxy: z.string(),
});

export type EnvReport = z.infer<typeof EnvReportSchema>;

/** État de configuration — présence uniquement, jamais de valeur. */
export function describeEnvironment(): EnvReport {
  return EnvReportSchema.parse({
    nodeEnv: nodeEnv(),
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasIpHashSalt: Boolean(process.env.IP_HASH_SALT),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    hasAppOrigin: Boolean(process.env.APP_ORIGIN),
    hasTurnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
    hasDistributedRateLimit: getRedisConfig() !== null,
    privateStorageDriver: getPrivateStorageConfig().driver,
    hasSmtp: getSmtpConfig() !== null,
    trustedProxy: getTrustedProxyMode(),
  });
}

/**
 * Vérifie tous les prérequis et retourne les avertissements **non bloquants**.
 *
 * Ne fait aucune écriture : ce module est importé par l'Edge middleware (via
 * `csrf`), où `process.stdout` n'existe pas. La journalisation vit dans
 * `config/startup.ts`, chargé uniquement sous Node. Un secret invalide, lui,
 * lève toujours — via `getServerEnv()`.
 */
export function assertProductionEnvironment(): readonly string[] {
  getServerEnv();

  const warnings: string[] = [];
  if (isRuntimeProduction() && getTrustedProxyMode() !== "cloudflare") {
    warnings.push("TRUSTED_PROXY absent : l'IP cliente n'est pas verifiable, cf. runbook.");
  }
  if (getRedisConfig() === null) {
    warnings.push(
      "UPSTASH_REDIS_REST_URL/TOKEN absents : limitation de debit non partagee entre instances."
    );
  }
  return warnings;
}

/** Réinitialise l'instantané mémoïsé — réservé aux tests. */
export function resetServerEnvCache(): void {
  cachedServerEnv = null;
}
