import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildCspHeader, generateNonce } from "@/lib/security/csp";
import { isDecoyAdminPath } from "@/lib/security/decoys";
import { detectMimeFromMagicBytes } from "@/lib/security/magicBytes";
import { redact } from "@/lib/security/security-events";
import { buildSecurityEmail } from "@/lib/services/notificationService";
import { THRESHOLDS } from "@/lib/security/login-throttle";
import { consumeRateLimit, resetMemoryRateLimits } from "@/lib/security/rateLimiter";

describe("En-têtes — politique de sécurité du contenu", () => {
  test("aucune directive permissive ne subsiste sur les scripts", () => {
    const csp = buildCspHeader("test-nonce", true);
    expect(csp).not.toContain("unsafe-eval");
    expect(csp).not.toContain("unpkg.com");
    // `unsafe-inline` reste toléré sur les attributs de style uniquement.
    expect(csp).toContain("style-src-attr 'unsafe-inline'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  });

  test("les directives de confinement sont présentes", () => {
    const csp = buildCspHeader("n", true);
    for (const directive of [
      "frame-ancestors 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "report-uri /api/security/csp-report",
      "upgrade-insecure-requests",
    ]) {
      expect(csp).toContain(directive);
    }
  });

  test("le nonce est unique à chaque requête", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonces.size).toBe(200);
    // 16 octets encodés en base64.
    expect(generateNonce()).toHaveLength(24);
  });

  test("le nonce est effectivement injecté dans la politique", () => {
    expect(buildCspHeader("abc123", true)).toContain("'nonce-abc123'");
  });
});

describe("Leurres d'administration", () => {
  test("les chemins de scanners connus sont piégés", () => {
    for (const p of ["/wp-admin", "/wp-admin/setup.php", "/.env", "/phpmyadmin/index.php"]) {
      expect(isDecoyAdminPath(p)).toBe(true);
    }
  });

  test("les chemins légitimes ne sont jamais piégés", () => {
    for (const p of ["/admin", "/admin/devis", "/mon-compte", "/services", "/api/auth/login"]) {
      expect(isDecoyAdminPath(p)).toBe(false);
    }
  });
});

describe("Détection de type par octets d'en-tête", () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0]);
  const pdf = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

  function riff(marker: string): Buffer {
    const buf = Buffer.alloc(12);
    buf.write("RIFF", 0, "ascii");
    buf.writeUInt32LE(4, 4);
    buf.write(marker, 8, "ascii");
    return buf;
  }

  test("les formats attendus sont reconnus", () => {
    expect(detectMimeFromMagicBytes(png)).toBe("image/png");
    expect(detectMimeFromMagicBytes(jpeg)).toBe("image/jpeg");
    expect(detectMimeFromMagicBytes(pdf)).toBe("application/pdf");
  });

  /**
   * Non-régression : la version précédente comparait les octets 8-11 à
   * « WAVE », donc rejetait les vrais WebP et acceptait les fichiers audio.
   */
  test("un vrai WebP est accepté et un WAV est refusé", () => {
    expect(detectMimeFromMagicBytes(riff("WEBP"))).toBe("image/webp");
    expect(detectMimeFromMagicBytes(riff("WAVE"))).toBeNull();
  });

  test("un exécutable et un fichier tronqué sont refusés", () => {
    expect(detectMimeFromMagicBytes(Buffer.from([0x4d, 0x5a, 0x90, 0x00]))).toBeNull();
    expect(detectMimeFromMagicBytes(Buffer.from([0x89]))).toBeNull();
  });
});

describe("Journalisation — purge des données sensibles", () => {
  test("les secrets sont masqués quel que soit le style de la clé", () => {
    const cleaned = redact({
      email: "client@example.be",
      password: "Motdepasse123!",
      totpCode: "123456",
      captcha_token: "abc",
      "Session-Token": "xyz",
      nested: { passwordHash: "$2a$12$..." },
    }) as Record<string, unknown>;

    expect(cleaned.password).toBe("[redacted]");
    expect(cleaned.totpCode).toBe("[redacted]");
    expect(cleaned.captcha_token).toBe("[redacted]");
    expect(cleaned["Session-Token"]).toBe("[redacted]");
    expect((cleaned.nested as Record<string, unknown>).passwordHash).toBe("[redacted]");
    // L'email reste, il est nécessaire au diagnostic et déjà en base.
    expect(cleaned.email).toBe("client@example.be");
  });

  test("les clés de pollution de prototype sont retirées du journal", () => {
    const cleaned = redact({ __proto__: { polluted: true }, ok: 1 }) as Record<string, unknown>;
    expect(Object.keys(cleaned)).not.toContain("__proto__");
  });
});

describe("Emails transactionnels", () => {
  test("un nom contenant du HTML ne casse pas le rendu", () => {
    const message = buildSecurityEmail({
      kind: "new-device-login",
      to: "client@example.be",
      context: { Nom: '<img src=x onerror=alert(1)>"' },
    });
    expect(message.html).not.toContain("<img src=x");
    expect(message.html).toContain("&lt;img");
  });

  test("les retours à la ligne ne permettent pas de forger un en-tête", () => {
    const message = buildSecurityEmail({
      kind: "account-locked",
      to: "client@example.be",
      context: { Nom: "Dupont\r\nBcc: victime@example.be" },
    });
    expect(message.html).not.toContain("\r\n");
    expect(message.text).not.toContain("Bcc: victime@example.be\n");
  });
});

describe("Limitation de débit", () => {
  beforeEach(() => resetMemoryRateLimits());
  afterEach(() => vi.unstubAllEnvs());

  test("le quota se ferme une fois atteint et annonce un délai", async () => {
    const options = { key: "test:quota", windowMs: 60_000, maxRequests: 3 };
    const results = [];
    for (let i = 0; i < 5; i += 1) results.push(await consumeRateLimit(options));

    expect(results.slice(0, 3).every((r) => r.allowed)).toBe(true);
    expect(results[3].allowed).toBe(false);
    expect(results[4].allowed).toBe(false);
    expect(results[3].retryAfterSeconds).toBeGreaterThan(0);
  });

  /**
   * Le point crucial de l'audit H3 : sans stockage partagé, le compteur est
   * local à l'instance. Le drapeau doit le dire pour que l'appelant alerte.
   */
  test("l'absence de stockage partagé est signalée, pas masquée", async () => {
    vi.stubEnv("UPSTASH_REDIS_REST_URL", "");
    vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "");
    const result = await consumeRateLimit({
      key: "test:distributed",
      windowMs: 60_000,
      maxRequests: 5,
    });
    expect(result.distributed).toBe(false);
  });

  test("les clés distinctes ne partagent pas leur quota", async () => {
    const base = { windowMs: 60_000, maxRequests: 1 };
    expect((await consumeRateLimit({ ...base, key: "ip:1.2.3.4" })).allowed).toBe(true);
    expect((await consumeRateLimit({ ...base, key: "ip:5.6.7.8" })).allowed).toBe(true);
    expect((await consumeRateLimit({ ...base, key: "ip:1.2.3.4" })).allowed).toBe(false);
  });
});

describe("Paliers de blocage de l'authentification", () => {
  test("les seuils suivent la progression demandée", () => {
    expect(THRESHOLDS.challenge).toBe(3);
    expect(THRESHOLDS.delay).toBe(5);
    expect(THRESHOLDS.lock).toBe(10);
  });
});
