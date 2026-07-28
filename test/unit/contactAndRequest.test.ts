import { describe, expect, it } from "vitest";
import { ContactMessageSchema } from "@/lib/validations/contact-schemas";
import { QuoteRequestSchema } from "@/lib/validations/quote-schemas";
import { formatPublicReference } from "@/lib/db/public-references";
import {
  canTransitionContactMessage,
  canTransitionQuoteRequest,
} from "@/domain/request-workflow";
import { generateTotpSecret, generateTotpToken } from "@/lib/auth/totp";
import { normalizeEmail, normalizePhone } from "@/lib/validations/normalize";
import {
  hasPlausibleFormTiming,
  MINIMUM_FORM_COMPLETION_MS,
} from "@/lib/security/form-timing";

describe("contact public", () => {
  const valid = {
    fullName: "  Zoë Martin  ",
    email: "ZOE@EXAMPLE.BE",
    phone: "0470 12 34 56",
    subject: "general",
    message: "Je souhaite obtenir davantage de renseignements.",
    consentPrivacy: true,
  };

  it("valide et normalise les coordonnées", () => {
    const parsed = ContactMessageSchema.parse(valid);
    expect(parsed.fullName).toBe("Zoë Martin");
    expect(parsed.email).toBe("zoe@example.be");
    expect(parsed.phone).toBe("0470123456");
  });

  it("refuse un sujet arbitraire et l'absence de consentement", () => {
    expect(ContactMessageSchema.safeParse({ ...valid, subject: "sql" }).success).toBe(false);
    expect(ContactMessageSchema.safeParse({ ...valid, consentPrivacy: false }).success).toBe(false);
  });
});

describe("anti-spam temporel", () => {
  it("refuse une soumission instantanée, future ou trop ancienne", () => {
    const now = 2_000_000_000_000;
    expect(hasPlausibleFormTiming(now - MINIMUM_FORM_COMPLETION_MS, now)).toBe(
      true
    );
    expect(hasPlausibleFormTiming(now - 50, now)).toBe(false);
    expect(hasPlausibleFormTiming(now + 1_000, now)).toBe(false);
    expect(hasPlausibleFormTiming(now - 25 * 60 * 60 * 1_000, now)).toBe(
      false
    );
  });
});

describe("demande de devis", () => {
  const valid = {
    interventionType: "refection",
    roofType: "ardoise",
    surface: "50-100",
    isUrgent: false,
    postalCode: "1000",
    city: "Bruxelles",
    fullName: "Zoë Martin",
    phone: "+32 470 12 34 56",
    email: "ZOE@example.be",
    description: "Réfection complète de la couverture.",
    rgpdConsent: true,
  };

  it("refuse une plage de surface qui ne vient pas de la liste métier", () => {
    expect(QuoteRequestSchema.safeParse({ ...valid, surface: "un-million" }).success).toBe(false);
  });

  it("normalise les identifiants", () => {
    expect(normalizeEmail(" ZOE@Example.be ")).toBe("zoe@example.be");
    expect(normalizePhone("+32 (0)470 12 34 56")).toBe("+320470123456");
  });
});

describe("références et transitions", () => {
  it("formate des références publiques à six chiffres", () => {
    expect(formatPublicReference("contact", 2026, 1)).toBe("CNT-2026-000001");
    expect(formatPublicReference("quote_request", 2026, 42)).toBe("DEV-2026-000042");
  });

  it("refuse les raccourcis de statut non déclarés", () => {
    expect(canTransitionContactMessage("new", "replied")).toBe(false);
    expect(canTransitionContactMessage("new", "in_progress")).toBe(true);
    expect(canTransitionQuoteRequest("submitted", "accepted")).toBe(false);
    expect(canTransitionQuoteRequest("submitted", "under_review")).toBe(true);
  });
});

describe("TOTP RFC 6238", () => {
  it("produit le vecteur SHA-1 attendu a 59 secondes, tronque a six chiffres", () => {
    expect(
      generateTotpToken(
        "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ",
        59_000
      )
    ).toBe("287082");
  });

  it("genere un secret compatible avec une URI otpauth", () => {
    const secret = generateTotpSecret("admin@example.test");
    expect(secret.base32).toMatch(/^[A-Z2-7]{32}$/);
    expect(secret.otpauth_url).toContain("otpauth://totp/");
    expect(secret.otpauth_url).toContain(`secret=${secret.base32}`);
  });
});
