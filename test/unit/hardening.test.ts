import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { buildContentSecurityPolicy, generateNonce } from "@/lib/security/csp";
import { isDecoyAdminPath } from "@/lib/security/decoys";
import { detectMimeFromMagicBytes } from "@/lib/security/magic-bytes";
import { redact } from "@/lib/security/security-events";
import { buildSecurityEmail } from "@/lib/services/notification-service";
import { THRESHOLDS } from "@/lib/security/login-throttle";
import { consumeRateLimit, resetMemoryRateLimits } from "@/lib/security/rate-limiter";

describe("En-têtes — politique de sécurité du contenu", () => {
  const prodNonce = () =>
    buildContentSecurityPolicy({
      nonce: "test-nonce",
      environment: "production",
      strategy: "nonce",
    });
  const prodStatic = () =>
    buildContentSecurityPolicy({ environment: "production", strategy: "static" });
  const devNonce = () =>
    buildContentSecurityPolicy({
      nonce: "test-nonce",
      environment: "development",
      strategy: "nonce",
    });

  test("`unsafe-eval` est absent de toute politique de production", () => {
    expect(prodNonce()).not.toContain("unsafe-eval");
    expect(prodStatic()).not.toContain("unsafe-eval");
    // Il n'est toléré qu'en développement, où React Refresh l'exige.
    expect(devNonce()).toContain("unsafe-eval");
  });

  test("les zones privées utilisent le nonce et interdisent l'inline", () => {
    const csp = prodNonce();
    expect(csp).toContain("script-src 'self' 'nonce-test-nonce' 'strict-dynamic'");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("style-src 'self' 'nonce-test-nonce'");
  });

  /**
   * Non-régression sur le défaut qui cassait le site : une page prérendue ne
   * peut pas recevoir de nonce. Si la politique statique en contenait un, les
   * navigateurs ignoreraient `'unsafe-inline'` et bloqueraient tout le
   * JavaScript des pages publiques.
   */
  test("la politique des pages prérendues ne contient jamais de nonce", () => {
    const csp = prodStatic();
    expect(csp).not.toContain("nonce-");
    expect(csp).not.toContain("strict-dynamic");
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
  });

  test("aucun domaine tiers superflu n'est autorisé", () => {
    for (const csp of [prodNonce(), prodStatic(), devNonce()]) {
      // Leaflet est auto-hébergé.
      expect(csp).not.toContain("unpkg.com");
      // `next/font` auto-héberge les polices au build.
      expect(csp).not.toContain("fonts.googleapis.com");
      expect(csp).not.toContain("fonts.gstatic.com");
      // Le widget Turnstile est rendu sur les formulaires publics.
      expect(csp).toContain("https://challenges.cloudflare.com");
      // Redondant avec le sous-domaine précis des tuiles.
      expect(csp).not.toContain("https://*.cartocdn.com");
    }
  });

  test("le seul domaine tiers autorisé est celui des tuiles, en images", () => {
    const csp = prodStatic();
    expect(csp).toContain("img-src 'self' data: blob: https://*.basemaps.cartocdn.com");
    // Les tuiles sont chargées en <img>, jamais en fetch.
    expect(csp).toContain("connect-src 'self'");
    expect(csp).not.toMatch(/connect-src[^;]*cartocdn/);
  });

  test("les directives de confinement sont présentes", () => {
    for (const directive of [
      "frame-ancestors 'none'",
      "frame-src https://challenges.cloudflare.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "manifest-src 'self'",
      "worker-src 'self'",
      "media-src 'self'",
      "report-uri /api/security/csp-report",
      "upgrade-insecure-requests",
    ]) {
      expect(prodNonce(), directive).toContain(directive);
    }
  });

  test("`upgrade-insecure-requests` est absent en développement (serveur HTTP)", () => {
    expect(devNonce()).not.toContain("upgrade-insecure-requests");
  });

  test("aucune directive n'est dupliquée ni vide", () => {
    // Directives dont la grammaire CSP n'accepte aucune valeur.
    const VALUELESS = new Set(["upgrade-insecure-requests", "block-all-mixed-content"]);

    for (const csp of [prodNonce(), prodStatic(), devNonce()]) {
      const parts = csp.split(";").map((p) => p.trim()).filter(Boolean);
      const names = parts.map((p) => p.split(/\s+/)[0]);
      expect(new Set(names).size, `doublon dans : ${csp}`).toBe(names.length);

      for (const part of parts) {
        const [name, ...values] = part.split(/\s+/);
        if (VALUELESS.has(name)) {
          expect(values.length, `${name} ne prend pas de valeur`).toBe(0);
        } else {
          expect(values.length, `directive vide : ${part}`).toBeGreaterThan(0);
        }
      }
    }
  });

  test("aucune source générique n'est autorisée", () => {
    for (const csp of [prodNonce(), prodStatic()]) {
      // On raisonne sur les *jetons* de source, pas sur des sous-chaînes :
      // `https://*.basemaps.cartocdn.com` contient « https: » sans être pour
      // autant la source générique `https:`.
      const tokens = csp
        .split(";")
        .flatMap((part) => part.trim().split(/\s+/).slice(1));

      for (const generic of ["*", "https:", "http:", "ws:", "wss:", "data:*"]) {
        expect(tokens, `source générique autorisée : ${generic}`).not.toContain(generic);
      }
      // Un caractère joker ne doit jamais couvrir un domaine entier.
      expect(tokens.filter((t) => t === "*" || t.startsWith("*."))).toEqual([]);
    }
  });

  test("le nonce est unique, aléatoire et bien formé", () => {
    const nonces = new Set(Array.from({ length: 200 }, () => generateNonce()));
    expect(nonces.size).toBe(200);
    // 16 octets encodés en base64.
    expect(generateNonce()).toHaveLength(24);
    expect(generateNonce()).toMatch(/^[A-Za-z0-9+/]{22}==$/);
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
