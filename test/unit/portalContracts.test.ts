import { describe, expect, test } from "vitest";
import { z } from "zod";
import {
  CONTACT_MESSAGE_STATUSES,
  QUOTE_REQUEST_STATUSES,
  canTransitionQuoteRequest,
} from "@/domain/request-workflow";
import {
  contactMessageLabel,
  contactMessageTone,
  interventionLabel,
  quoteRequestClientLabel,
  quoteRequestLabel,
  quoteRequestNextStep,
  quoteRequestTone,
  roofLabel,
  surfaceLabel,
} from "@/domain/request-labels";
import {
  API_ERROR_STATUS,
  apiError,
  apiSuccess,
  type ApiErrorCode,
} from "@/lib/api/responses";
import { toFieldErrors } from "@/lib/api/validation";
import { readApiError, readApiMessage } from "@/lib/api/client";
import {
  CancelQuoteRequestSchema,
  CreateInternalNoteSchema,
  UpdateProfileSchema,
} from "@/lib/validations/account-schemas";
import { PaginationSchema, MAX_PAGE_SIZE } from "@/lib/validations/identifiers";
import { buildReplyMailto } from "@/lib/services/contact-reply";

describe("Libellés métier", () => {
  test("couvre tous les statuts, sans jamais renvoyer la valeur technique", () => {
    for (const status of QUOTE_REQUEST_STATUSES) {
      for (const label of [quoteRequestLabel(status), quoteRequestClientLabel(status)]) {
        expect(label.length).toBeGreaterThan(0);
        expect(label).not.toBe(status);
        expect(label).not.toMatch(/_/);
      }
      expect(quoteRequestNextStep(status).length).toBeGreaterThan(0);
      expect(["neutral", "progress", "positive", "negative"]).toContain(
        quoteRequestTone(status)
      );
    }

    for (const status of CONTACT_MESSAGE_STATUSES) {
      expect(contactMessageLabel(status)).not.toBe(status);
      expect(["neutral", "progress", "positive", "negative"]).toContain(
        contactMessageTone(status)
      );
    }
  });

  test("traduit les valeurs contraintes du formulaire de demande", () => {
    expect(interventionLabel("demoussage")).toBe("Démoussage");
    expect(roofLabel("tuile_terre_cuite")).toBe("Tuile en terre cuite");
    expect(surfaceLabel("more_150")).toBe("Plus de 150 m²");
  });

  test("laisse passer une valeur inconnue plutôt que d'afficher du vide", () => {
    // Une anomalie doit rester visible : masquer une valeur inattendue derrière
    // une chaîne vide la rendrait indétectable en exploitation.
    expect(interventionLabel("valeur_imprevue")).toBe("valeur_imprevue");
    expect(roofLabel("")).toBe("");
  });
});

describe("Enveloppe des réponses d'API", () => {
  test("associe chaque code au statut HTTP attendu", () => {
    const expected: Record<ApiErrorCode, number> = {
      VALIDATION_ERROR: 422,
      UNAUTHENTICATED: 401,
      FORBIDDEN: 403,
      NOT_FOUND: 404,
      CONFLICT: 409,
      RATE_LIMITED: 429,
      UNSUPPORTED_MEDIA_TYPE: 415,
      BAD_REQUEST: 400,
      INTERNAL_ERROR: 500,
      SERVICE_UNAVAILABLE: 503,
    };
    expect(API_ERROR_STATUS).toStrictEqual(expected);
  });

  test("produit la forme normalisée et le bon statut", async () => {
    const ok = apiSuccess({ reference: "DEM-2026-000001" });
    expect(ok.status).toBe(200);
    await expect(ok.json()).resolves.toStrictEqual({
      success: true,
      data: { reference: "DEM-2026-000001" },
    });

    const denied = apiError("FORBIDDEN");
    expect(denied.status).toBe(403);
    const body: unknown = await denied.json();
    expect(body).toMatchObject({
      success: false,
      error: { code: "FORBIDDEN" },
    });
  });

  test("n'expose jamais de détail technique dans le message par défaut", async () => {
    for (const code of Object.keys(API_ERROR_STATUS) as ApiErrorCode[]) {
      const body: unknown = await apiError(code).json();
      const message = JSON.stringify(body);
      expect(message).not.toMatch(/postgres|relation|select |at Object\.|node_modules/i);
    }
  });

  test("omet la clé `fields` quand aucun champ n'est en erreur", async () => {
    const schema = z.object({ phone: z.string().min(8) });
    const failure = schema.safeParse({ phone: "1" });
    expect(failure.success).toBe(false);
    if (failure.success) return;

    const fields = toFieldErrors(failure.error);
    expect(fields.phone?.length).toBeGreaterThan(0);

    const body: unknown = await apiError("VALIDATION_ERROR").json();
    expect(body).not.toHaveProperty("error.fields");
  });
});

describe("Lecture des réponses côté navigateur", () => {
  test("extrait le message des deux formes de corps", async () => {
    const normalized = new Response(
      JSON.stringify({ success: false, error: { code: "CONFLICT", message: "Trop tard." } }),
      { status: 409 }
    );
    await expect(readApiError(normalized, "défaut")).resolves.toBe("Trop tard.");

    const legacy = new Response(JSON.stringify({ success: false, error: "Ancien format." }), {
      status: 400,
    });
    await expect(readApiError(legacy, "défaut")).resolves.toBe("Ancien format.");
  });

  test("retombe sur le message par défaut si le corps n'est pas exploitable", async () => {
    const html = new Response("<html>502 Bad Gateway</html>", { status: 502 });
    await expect(readApiError(html, "Serveur injoignable.")).resolves.toBe(
      "Serveur injoignable."
    );

    const empty = new Response(JSON.stringify({ success: false }), { status: 500 });
    await expect(readApiError(empty, "défaut")).resolves.toBe("défaut");
  });

  test("lit le message porté par la charge utile de succès", async () => {
    const ok = new Response(JSON.stringify({ success: true, data: { message: "Fait." } }));
    await expect(readApiMessage(ok, "défaut")).resolves.toBe("Fait.");
  });
});

describe("Schémas des mutations de compte", () => {
  test("refuse tout champ hors liste blanche", () => {
    // C'est le verrou contre l'affectation de masse : `role` doit faire échouer
    // la validation, pas être silencieusement ignoré.
    expect(UpdateProfileSchema.safeParse({ phone: "0470123456", role: "admin" }).success).toBe(
      false
    );
    expect(UpdateProfileSchema.safeParse({ phone: "0470123456", id: "x" }).success).toBe(false);
    expect(
      CreateInternalNoteSchema.safeParse({
        entityType: "quote_request",
        entityId: "3f4c1b2e-0000-4000-8000-000000000000",
        content: "ok",
        authorUserId: "usurpé",
      }).success
    ).toBe(false);
  });

  test("normalise le téléphone et accepte l'effacement", () => {
    const parsed = UpdateProfileSchema.safeParse({ phone: "0470 12 34 56" });
    expect(parsed.success && parsed.data.phone).toBe("0470123456");
    expect(UpdateProfileSchema.safeParse({ phone: "" }).success).toBe(true);
    expect(UpdateProfileSchema.safeParse({ phone: "123" }).success).toBe(false);
  });

  test("borne la note interne aux limites de la contrainte SQL", () => {
    const base = {
      entityType: "contact_message" as const,
      entityId: "3f4c1b2e-0000-4000-8000-000000000000",
    };
    expect(CreateInternalNoteSchema.safeParse({ ...base, content: "" }).success).toBe(false);
    expect(
      CreateInternalNoteSchema.safeParse({ ...base, content: "a".repeat(5001) }).success
    ).toBe(false);
    expect(
      CreateInternalNoteSchema.safeParse({ ...base, content: "a".repeat(5000) }).success
    ).toBe(true);
    expect(
      CreateInternalNoteSchema.safeParse({ ...base, entityType: "users", content: "x" }).success
    ).toBe(false);
  });

  test("n'accepte que les références bien formées à l'annulation", () => {
    expect(CancelQuoteRequestSchema.safeParse({ reference: "DEM-2026-000123" }).success).toBe(
      true
    );
    // Les anciennes références DEV restent lisibles après le renommage.
    expect(CancelQuoteRequestSchema.safeParse({ reference: "DEV-2026-000123" }).success).toBe(
      true
    );
    for (const hostile of [
      "DEM-2026-1",
      "' OR 1=1 --",
      "FACT-2026-0001",
      "../../etc/passwd",
      "DEM-2026-000123 ",
    ]) {
      const parsed = CancelQuoteRequestSchema.safeParse({ reference: hostile });
      if (hostile.endsWith(" ")) {
        // Le `trim()` du schéma récupère l'espace final, ce qui est voulu.
        expect(parsed.success).toBe(true);
      } else {
        expect(parsed.success).toBe(false);
      }
    }
  });
});

describe("Pagination", () => {
  test("borne les valeurs hostiles au lieu de lever", () => {
    expect(PaginationSchema.parse({ page: "0", limit: "10" }).page).toBe(1);
    expect(PaginationSchema.parse({ page: "-5", limit: "10" }).page).toBe(1);
    expect(PaginationSchema.parse({ page: "abc", limit: "10" }).page).toBe(1);
    expect(PaginationSchema.parse({ page: "2", limit: "99999" }).limit).toBe(MAX_PAGE_SIZE);
    expect(PaginationSchema.parse({ page: "2", limit: "0" }).limit).toBe(1);
  });

  test("ne permet jamais de demander plus que le plafond", () => {
    for (const limit of ["1000", "100000", "1e9", "-1"]) {
      expect(PaginationSchema.parse({ page: "1", limit }).limit).toBeLessThanOrEqual(
        MAX_PAGE_SIZE
      );
    }
  });
});

describe("Lien de réponse aux contacts", () => {
  test("encode toute valeur interpolée", () => {
    const mailto = buildReplyMailto({
      email: "client@example.be",
      reference: "CNT-2026-000001",
      fullName: "Jean & Cie <injection>",
    });

    expect(mailto.startsWith("mailto:client%40example.be?")).toBe(true);
    // Ni `&` brut, ni chevrons : impossible d'ajouter un paramètre à l'URI.
    expect(mailto).not.toMatch(/Jean & Cie/);
    expect(mailto).not.toMatch(/[<>]/);
    expect(mailto).toContain("CNT-2026-000001");
  });

  test("ne dépasse pas la longueur tolérée par les clients de messagerie", () => {
    const mailto = buildReplyMailto({
      email: "client@example.be",
      reference: "CNT-2026-000001",
      fullName: "x".repeat(4000),
    });
    expect(mailto.length).toBeLessThan(2000);
  });
});

describe("Annulation client et machine à états", () => {
  test("n'autorise l'annulation que depuis les états ouverts", () => {
    const cancellable = QUOTE_REQUEST_STATUSES.filter((status) =>
      canTransitionQuoteRequest(status, "cancelled")
    );

    expect(cancellable).toContain("submitted");
    expect(cancellable).toContain("under_review");
    // Un dossier tranché ou clos ne se rouvre pas par une annulation.
    expect(cancellable).not.toContain("accepted");
    expect(cancellable).not.toContain("archived");
    expect(cancellable).not.toContain("cancelled");
  });
});
