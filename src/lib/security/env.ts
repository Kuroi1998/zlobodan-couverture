import { z } from "zod";

/**
 * Validation de l'environnement.
 *
 * Le code contenait trois valeurs de repli dangereuses (audit H8) :
 *  - `TURNSTILE_SECRET_KEY` retombait sur la clé de test Cloudflare, qui
 *    valide *n'importe quel* jeton. Une variable oubliée transformait donc
 *    silencieusement l'anti-automate en contrôle qui répond toujours « oui ».
 *  - `IP_HASH_SALT` retombait sur un sel présent dans le dépôt, ce qui rend
 *    les empreintes d'IP de l'audit réversibles par force brute.
 *  - `DATABASE_URL` retombait sur un `localhost` à identifiants publics.
 *
 * Principe retenu : un secret n'a jamais de valeur par défaut. En production,
 * son absence arrête le démarrage plutôt que de dégrader la protection sans
 * le dire.
 */

const MIN_SECRET_LENGTH = 32;

/** Clé de test publique Cloudflare : accepte tout, donc interdite en production. */
const TURNSTILE_TEST_SECRET = "1x0000000000000000000000000000000AA";

/**
 * `next build` s'exécute avec `NODE_ENV=production` et évalue les modules pour
 * collecter les routes, sans jamais servir de trafic. Exiger les secrets de
 * production à ce moment casserait la compilation en intégration continue,
 * où ils n'ont rien à faire.
 *
 * La garde ne s'applique donc qu'au serveur en fonctionnement. Le contrôle au
 * démarrage réel est fait par `instrumentation.ts`, avant la première requête.
 */
function isBuildPhase(): boolean {
  return process.env.NEXT_PHASE === "phase-production-build";
}

const isProduction = () => process.env.NODE_ENV === "production" && !isBuildPhase();

function fail(variable: string, reason: string): never {
  throw new Error(
    `[securite] Variable d'environnement ${variable} : ${reason}. ` +
      "Le démarrage est interrompu volontairement — voir docs/runbook-infrastructure.md."
  );
}

/**
 * Lecture d'un secret obligatoire en production.
 * En développement, une valeur de substitution explicite est tolérée et
 * signalée, pour ne pas imposer un coffre pour lancer `next dev`.
 */
function requireSecret(name: string, devFallback: string, minLength = MIN_SECRET_LENGTH): string {
  const value = process.env[name];

  if (!value || value.trim().length === 0) {
    if (isProduction()) fail(name, "absente alors qu'elle est obligatoire en production");
    return devFallback;
  }

  if (isProduction() && value.length < minLength) {
    fail(name, `trop courte (${value.length} caractères, minimum ${minLength})`);
  }

  return value;
}

export function requireDatabaseUrl(): string {
  const value = process.env.DATABASE_URL;

  if (!value || value.trim().length === 0) {
    if (isProduction()) fail("DATABASE_URL", "absente");
    return "postgres://postgres:postgres@localhost:5432/zlobodan";
  }

  if (isProduction()) {
    if (!/^postgres(ql)?:\/\//.test(value)) {
      fail("DATABASE_URL", "schéma de connexion inattendu");
    }
    // Chiffrement en transit obligatoire vers la base.
    if (!/[?&]sslmode=(require|verify-ca|verify-full)/.test(value)) {
      fail("DATABASE_URL", "sslmode=require (ou verify-full) manquant");
    }
  }

  return value;
}

export function requireIpHashSalt(): string {
  return requireSecret("IP_HASH_SALT", "dev-only-salt-not-for-production-use-0000");
}

export function requireSessionSecret(): string {
  return requireSecret("SESSION_SECRET", "dev-only-session-secret-not-for-production");
}

/**
 * Secret Turnstile. Retourne `null` quand l'anti-automate n'est volontairement
 * pas configuré en développement — l'appelant doit alors traiter la
 * vérification comme *non effectuée*, jamais comme réussie.
 */
export function getTurnstileSecret(): string | null {
  const value = process.env.TURNSTILE_SECRET_KEY;

  if (isProduction()) {
    if (!value) fail("TURNSTILE_SECRET_KEY", "absente");
    if (value === TURNSTILE_TEST_SECRET) {
      fail("TURNSTILE_SECRET_KEY", "clé de test Cloudflare : elle valide tous les jetons");
    }
    return value;
  }

  return value ?? null;
}

const EnvReportSchema = z.object({
  hasDatabaseUrl: z.boolean(),
  hasIpHashSalt: z.boolean(),
  hasSessionSecret: z.boolean(),
  hasTurnstile: z.boolean(),
  hasDistributedRateLimit: z.boolean(),
  trustedProxy: z.string(),
});

export type EnvReport = z.infer<typeof EnvReportSchema>;

/** Instantané de configuration, exposé au diagnostic de démarrage et aux tests. */
export function describeEnvironment(): EnvReport {
  return EnvReportSchema.parse({
    hasDatabaseUrl: Boolean(process.env.DATABASE_URL),
    hasIpHashSalt: Boolean(process.env.IP_HASH_SALT),
    hasSessionSecret: Boolean(process.env.SESSION_SECRET),
    hasTurnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
    hasDistributedRateLimit: Boolean(
      process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
    ),
    trustedProxy: process.env.TRUSTED_PROXY ?? "none",
  });
}

/**
 * Vérifie l'ensemble des prérequis d'un coup. Appelée au chargement de
 * `instrumentation.ts` pour que l'échec survienne au démarrage du serveur et
 * non à la première requête d'un visiteur.
 */
export function assertProductionEnvironment(): void {
  requireDatabaseUrl();
  requireIpHashSalt();
  requireSessionSecret();
  getTurnstileSecret();

  if (isProduction() && process.env.TRUSTED_PROXY !== "cloudflare") {
    // Non bloquant : un déploiement sans CDN reste possible, mais il perd la
    // seule source d'IP fiable et doit le savoir.
    process.stdout.write(
      `${JSON.stringify({
        channel: "security",
        kind: "ENV_WARNING",
        severity: "medium",
        detail: "TRUSTED_PROXY absent : l'IP cliente n'est pas verifiable, cf. runbook.",
      })}\n`
    );
  }
}
