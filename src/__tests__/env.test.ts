import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  getAppOrigin,
  getRedisConfig,
  getTurnstileSecret,
  maskDatabaseUrl,
  requireDatabaseUrl,
  requireSessionSecret,
  requireTwoFactorEncryptionKey,
  resetServerEnvCache,
} from "@/config/env";
import { getDatabaseErrorMessage } from "@/db/diagnostics";

/**
 * Validation de l'environnement.
 *
 * Les tests manipulent `NODE_ENV` et les variables via `vi.stubEnv`, puis
 * réinitialisent l'instantané mémoïsé. La production est simulée sans phase de
 * build (`NEXT_PHASE` absent), donc la garde stricte s'applique.
 */
beforeEach(() => {
  vi.stubEnv("TEST_DATABASE_URL", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
  resetServerEnvCache();
});

const STRONG_SECRET = "a".repeat(40);
const PROD_DB = "postgres://user:pass@db.internal:5432/zlobodan?sslmode=require";

describe("DATABASE_URL", () => {
  test("une URL PostgreSQL valide est acceptée en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", PROD_DB);
    expect(requireDatabaseUrl()).toBe(PROD_DB);
  });

  test("un schéma non PostgreSQL est refusé", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "mysql://user:pass@db:3306/x?sslmode=require");
    expect(() => requireDatabaseUrl()).toThrow(/PostgreSQL/);
  });

  test("l'absence de sslmode est refusée en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "postgres://user:pass@db.internal:5432/zlobodan");
    expect(() => requireDatabaseUrl()).toThrow(/sslmode/);
  });

  test("une DATABASE_URL absente arrête le démarrage en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("DATABASE_URL", "");
    expect(() => requireDatabaseUrl()).toThrow(/absente/);
  });

  test("en développement, un repli local est fourni", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("DATABASE_URL", "");
    expect(requireDatabaseUrl()).toContain("localhost");
  });
});

describe("Garde base-de-test", () => {
  test("un hôte distant est refusé en mode test", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@db.production.example.com:5432/real");
    expect(() => requireDatabaseUrl()).toThrow(/non local/);
  });

  test("un hôte local est accepté en mode test", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/z");
    expect(requireDatabaseUrl()).toContain("localhost");
  });

  test("TEST_DATABASE_URL explicite prime, mais reste contrainte au local", () => {
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("DATABASE_URL", "postgres://u:p@localhost:5432/z");
    vi.stubEnv("TEST_DATABASE_URL", "postgres://u:p@127.0.0.1:5432/zlobodan_test");
    expect(requireDatabaseUrl()).toContain("zlobodan_test");

    vi.stubEnv("TEST_DATABASE_URL", "postgres://u:p@remote.example.com:5432/x");
    expect(() => requireDatabaseUrl()).toThrow(/non local/);
  });
});

describe("Secrets", () => {
  test("un secret trop court est refusé en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", "trop-court");
    expect(() => requireSessionSecret()).toThrow(/trop courte/);
  });

  test("un secret suffisant est accepté", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("SESSION_SECRET", STRONG_SECRET);
    expect(requireSessionSecret()).toBe(STRONG_SECRET);
  });

  test("la clé de chiffrement 2FA est distincte et obligatoire en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TWO_FACTOR_ENCRYPTION_KEY", "");
    expect(() => requireTwoFactorEncryptionKey()).toThrow(/absente/);
    vi.stubEnv("TWO_FACTOR_ENCRYPTION_KEY", STRONG_SECRET);
    expect(requireTwoFactorEncryptionKey()).toBe(STRONG_SECRET);
  });

  test("la clé de test Turnstile est refusée en production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "1x0000000000000000000000000000000AA");
    expect(() => getTurnstileSecret()).toThrow(/valide tous les jetons/);
  });

  test("Turnstile absent en dev vaut null, pas une fausse réussite", () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("TURNSTILE_SECRET_KEY", "");
    expect(getTurnstileSecret()).toBeNull();
  });
});

describe("APP_ORIGIN", () => {
  test("l'origine est normalisée", () => {
    vi.stubEnv("APP_ORIGIN", "https://zlobodan-couverture.be/chemin/ignore");
    expect(getAppOrigin()).toBe("https://zlobodan-couverture.be");
  });

  test("une URL invalide est refusée", () => {
    vi.stubEnv("APP_ORIGIN", "pas-une-url");
    expect(() => getAppOrigin()).toThrow(/invalide/);
  });
});

describe("Redis", () => {
  test("l'absence d'une des deux variables désactive le mode distribué", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    expect(getRedisConfig()).toBeNull();
  });

  test("les deux présentes activent le mode distribué", () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://x.upstash.io/");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "jeton");
    expect(getRedisConfig()).toEqual({ url: "https://x.upstash.io", token: "jeton" });
  });
});

describe("Masquage d'URL pour journalisation", () => {
  test("l'utilisateur et le mot de passe n'apparaissent jamais", () => {
    const masked = maskDatabaseUrl("postgres://admin:SUPERSECRET@db.internal:5432/zlobodan");
    expect(masked).toBe("db.internal:5432/zlobodan");
    expect(masked).not.toContain("SUPERSECRET");
    expect(masked).not.toContain("admin");
  });

  test("une URL illisible ne fuit pas son contenu", () => {
    expect(maskDatabaseUrl("n'importe:quoi:SECRET")).toBe("<invalide>");
  });
});

describe("Normalisation des erreurs PostgreSQL", () => {
  const cases: Array<[string, RegExp]> = [
    ["28P01", /identifiants invalides/],
    ["3D000", /n'existe pas/],
    ["42P01", /migrations ne sont pas appliquées/],
    ["ECONNREFUSED", /refuse la connexion/],
    ["ENOTFOUND", /introuvable/],
    ["ETIMEDOUT", /expiré/],
  ];

  test("chaque code connu produit un message clair", () => {
    for (const [code, pattern] of cases) {
      expect(getDatabaseErrorMessage({ code })).toMatch(pattern);
    }
  });

  test("un code inconnu retombe sur un message générique sans détail", () => {
    expect(getDatabaseErrorMessage({ code: "XX999", message: "secret interne" })).toBe(
      "La connexion à la base de données a échoué."
    );
    expect(getDatabaseErrorMessage("chaîne brute")).toBe(
      "La connexion à la base de données a échoué."
    );
  });
});
