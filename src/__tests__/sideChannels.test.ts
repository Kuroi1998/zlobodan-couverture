import { describe, expect, test, vi, afterEach } from "vitest";
import { safeReturnPath, isAllowedCorsOrigin, buildAbsoluteUrl } from "@/lib/security/urls";
import { timingSafeEqualHex, timingSafeEqualString } from "@/lib/security/constant-time";
import { isPrivatePath, stripUnsafeInboundHeaders } from "@/lib/security/cache-control";
import { normalizeEmail, sanitizeForLog, stripInvisibleChars } from "@/lib/validations/normalize";
import { validatePasswordPolicy, passwordByteLength } from "@/lib/auth/password";
import { detectMimeFromMagicBytes, looksLikeSvgOrXml } from "@/lib/security/magic-bytes";
import { readIdempotencyHeader, buildIdempotencyKey } from "@/lib/security/idempotency";
import { LoginSchema, RegisterSchema } from "@/lib/validations/auth-schemas";

/** U+FB03 : ligature « ffi », qui se decompose en "ffi" sous NFKC. */
const LIGATURE_FFI = String.fromCharCode(0xfb03);

afterEach(() => vi.unstubAllEnvs());

describe("Open redirect", () => {
  test("les chemins relatifs légitimes sont conservés", () => {
    expect(safeReturnPath("/mon-compte/factures")).toBe("/mon-compte/factures");
    expect(safeReturnPath("/admin/devis")).toBe("/admin/devis");
  });

  test("toute destination externe est refusée", () => {
    const hostiles = [
      "https://attaquant.example",
      "//attaquant.example",
      "\\\\attaquant.example",
      "/\\attaquant.example",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      "http://attaquant.example/mon-compte",
      "%2F%2Fattaquant.example",
      "mon-compte",
    ];
    for (const hostile of hostiles) {
      expect(safeReturnPath(hostile)).toBe("/mon-compte");
    }
  });

  test("le repli est respecté et les valeurs absentes sont tolérées", () => {
    expect(safeReturnPath(undefined, "/admin")).toBe("/admin");
    expect(safeReturnPath("", "/admin")).toBe("/admin");
    expect(safeReturnPath(42 as unknown as string, "/admin")).toBe("/admin");
    expect(safeReturnPath("/x".repeat(400))).toBe("/mon-compte");
  });

  test("le découpage de réponse par retour à la ligne est refusé", () => {
    expect(safeReturnPath("/ok%0d%0aSet-Cookie:%20a=b")).toBe("/mon-compte");
  });
});

describe("Injection d'en-tête Host", () => {
  test("l'URL de base vient de l'environnement, jamais d'une requête", () => {
    vi.stubEnv("APP_ORIGIN", "https://zlobodan-couverture.be");
    expect(buildAbsoluteUrl("/reset", { token: "abc" })).toBe(
      "https://zlobodan-couverture.be/reset?token=abc"
    );
  });

  test("l'origine CORS n'est jamais un reflet de l'en-tête reçu", () => {
    vi.stubEnv("APP_ORIGIN", "https://zlobodan-couverture.be");
    expect(isAllowedCorsOrigin("https://zlobodan-couverture.be")).toBe(true);
    expect(isAllowedCorsOrigin("https://attaquant.example")).toBe(false);
    expect(isAllowedCorsOrigin("null")).toBe(false);
    expect(isAllowedCorsOrigin(null)).toBe(false);
  });
});

describe("Comparaisons en temps constant", () => {
  test("l'égalité et l'inégalité sont correctement décidées", () => {
    const a = "a".repeat(64);
    expect(timingSafeEqualString("secret", "secret")).toBe(true);
    expect(timingSafeEqualString("secret", "secreu")).toBe(false);
    expect(timingSafeEqualHex(a, a)).toBe(true);
    expect(timingSafeEqualHex(a, "b".repeat(64))).toBe(false);
  });

  test("des longueurs différentes ne lèvent pas et ne fuient pas", () => {
    expect(timingSafeEqualHex("abcd", "abcdef")).toBe(false);
    expect(timingSafeEqualString("court", "beaucoup plus long")).toBe(false);
  });

  test("une valeur non hexadécimale est refusée sans exception", () => {
    expect(timingSafeEqualHex("zzzz", "zzzz")).toBe(false);
  });
});

describe("Cache des zones authentifiées", () => {
  test("les zones privées sont reconnues", () => {
    for (const p of ["/mon-compte", "/mon-compte/factures", "/admin", "/admin/audit", "/api/devis"]) {
      expect(isPrivatePath(p)).toBe(true);
    }
  });

  test("les pages publiques restent cachables", () => {
    for (const p of ["/", "/services", "/realisations/x", "/contact", "/couvreur-bruxelles"]) {
      expect(isPrivatePath(p)).toBe(false);
    }
  });

  /** Un préfixe ne doit pas capturer une route publique qui commence pareil. */
  test("le contrôle porte sur le segment, pas sur la sous-chaîne", () => {
    expect(isPrivatePath("/administration-publique")).toBe(false);
    expect(isPrivatePath("/mon-compte-client-public")).toBe(false);
  });

  test("les en-têtes d'empoisonnement de cache sont retirés de la requête", () => {
    const headers = new Headers({
      "x-forwarded-host": "attaquant.example",
      "x-original-url": "/admin",
      "x-rewrite-url": "/admin",
      "x-admin": "1",
      "x-user-id": "usr-0000",
      "user-agent": "Mozilla/5.0",
    });
    const removed = stripUnsafeInboundHeaders(headers);

    expect(removed).toContain("x-forwarded-host");
    expect(removed).toContain("x-admin");
    expect(removed).toContain("x-user-id");
    expect(headers.get("x-forwarded-host")).toBeNull();
    expect(headers.get("x-original-url")).toBeNull();
    // Les en-têtes légitimes sont conservés.
    expect(headers.get("user-agent")).toBe("Mozilla/5.0");
  });
});

describe("Normalisation Unicode des identifiants", () => {
  test("la casse ne crée pas un second compte", () => {
    expect(normalizeEmail("Jean.Peeters@Example.BE")).toBe("jean.peeters@example.be");
    expect(normalizeEmail("  jean@example.be  ")).toBe("jean@example.be");
  });

  test("les ligatures de compatibilité sont repliées par NFKC", () => {
    // « oﬃce » et « office » désignent la même boîte pour le serveur de
    // messagerie, mais seraient deux comptes distincts sans normalisation.
    expect(normalizeEmail(`o${LIGATURE_FFI}ce@example.be`)).toBe("office@example.be");
  });

  test("les espaces invisibles ne permettent pas de créer un doublon", () => {
    expect(normalizeEmail("jean​@example.be")).toBe("jean@example.be");
    expect(normalizeEmail("jean@example.be﻿")).toBe("jean@example.be");
    expect(stripInvisibleChars("a‮b")).toBe("ab");
  });

  test("le schéma d'inscription normalise avant de valider", () => {
    const parsed = RegisterSchema.safeParse({
      email: "Jean@Example.BE",
      password: "motdepasse-tres-long",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.email).toBe("jean@example.be");
  });
});

describe("Injection de journal", () => {
  test("les retours à la ligne sont neutralisés dans les valeurs journalisées", () => {
    const forged = sanitizeForLog(
      'Dupont\n{"channel":"security","kind":"LOGIN_SUCCESS","userId":"admin"}'
    );
    expect(forged).not.toContain("\n");
    expect(forged).not.toContain("\r");
  });

  test("la longueur journalisée est bornée", () => {
    expect(sanitizeForLog("x".repeat(2000)).length).toBeLessThanOrEqual(501);
  });
});

describe("Longueur et troncature des mots de passe", () => {
  test("un mot de passe trop court ou trop long est refusé", () => {
    expect(validatePasswordPolicy("court").isValid).toBe(false);
    expect(validatePasswordPolicy("a".repeat(129)).isValid).toBe(false);
  });

  /**
   * bcrypt tronque à 72 octets : sans ce contrôle, deux mots de passe
   * différents au-delà de cette limite produisent la même empreinte.
   */
  test("le dépassement de 72 octets est refusé explicitement", () => {
    expect(validatePasswordPolicy("a".repeat(73)).isValid).toBe(false);
    expect(validatePasswordPolicy("a".repeat(72)).isValid).toBe(true);
    // Un accent occupe deux octets : 40 caractères = 80 octets.
    expect(passwordByteLength("é".repeat(40))).toBe(80);
    expect(validatePasswordPolicy("é".repeat(40)).isValid).toBe(false);
  });

  test("le schéma de connexion plafonne le mot de passe avant tout hachage", () => {
    const huge = LoginSchema.safeParse({ email: "a@b.be", password: "x".repeat(100000) });
    expect(huge.success).toBe(false);
  });
});

describe("Uploads — SVG et types", () => {
  test("un SVG est refusé, y compris précédé d'une déclaration XML", () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
    const xmlSvg = Buffer.from('<?xml version="1.0"?><svg onload="alert(1)"></svg>');
    expect(looksLikeSvgOrXml(svg)).toBe(true);
    expect(detectMimeFromMagicBytes(svg)).toBeNull();
    expect(detectMimeFromMagicBytes(xmlSvg)).toBeNull();
  });

  test("un SVG précédé d'espaces reste refusé", () => {
    expect(detectMimeFromMagicBytes(Buffer.from('   \n  <svg></svg>'))).toBeNull();
  });

  test("les formats légitimes passent toujours", () => {
    expect(detectMimeFromMagicBytes(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBe(
      "image/png"
    );
  });
});

describe("Idempotence", () => {
  test("l'en-tête est validé en forme et en longueur", () => {
    const ok = new Headers({ "idempotency-key": "req-2026-07-25-abc123" });
    expect(readIdempotencyHeader(ok)).toBe("req-2026-07-25-abc123");

    expect(readIdempotencyHeader(new Headers({ "idempotency-key": "court" }))).toBeNull();
    expect(readIdempotencyHeader(new Headers({ "idempotency-key": "x".repeat(200) }))).toBeNull();
    expect(readIdempotencyHeader(new Headers({ "idempotency-key": "a b;drop" }))).toBeNull();
    expect(readIdempotencyHeader(new Headers())).toBeNull();
  });

  /**
   * L'utilisateur entre dans la clé : sans cela, un client devinant la clé
   * d'un autre bloquerait son opération — un déni de service ciblé.
   */
  test("la clé dépend de l'utilisateur et de l'opération", () => {
    const a = buildIdempotencyKey("usr-1", "create-quote", "k1");
    const b = buildIdempotencyKey("usr-2", "create-quote", "k1");
    const c = buildIdempotencyKey("usr-1", "create-invoice", "k1");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
    expect(a).toBe(buildIdempotencyKey("usr-1", "create-quote", "k1"));
  });
});
