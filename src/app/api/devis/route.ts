import { NextRequest, NextResponse } from "next/server";
import { HONEYPOT_FIELD, QuoteRequestSchema } from "@/lib/validations/quote-schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { readIdempotencyHeader } from "@/lib/security/idempotency";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { getCurrentUser } from "@/lib/security/session-guard";
import { submitQuoteRequest } from "@/lib/services/quote-request-service";
import {
  DuplicateSubmissionError,
  InvalidQuoteDraftError,
} from "@/lib/services/submission-errors";
import { UploadRejected, UPLOAD_LIMITS } from "@/lib/security/upload-service";
import { UuidSchema } from "@/lib/validations/identifiers";
import {
  FORM_STARTED_AT_FIELD,
  hasPlausibleFormTiming,
} from "@/lib/security/form-timing";

export const dynamic = "force-dynamic";

const ROUTE = "/api/devis";
const MAX_FORM_BYTES = UPLOAD_LIMITS.MAX_BATCH_BYTES + 2 * 1024 * 1024;

function stringField(formData: FormData, name: string): string | undefined {
  const value = formData.get(name);
  return typeof value === "string" ? value : undefined;
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
    return NextResponse.json(
      { success: false, error: "Type de contenu non pris en charge." },
      { status: 415 }
    );
  }

  const submissionKey = readIdempotencyHeader(req.headers);
  if (!submissionKey) {
    return NextResponse.json(
      { success: false, error: "Clé de soumission absente ou invalide." },
      { status: 400 }
    );
  }

  const ipLimit = await enforceRateLimit(req, "quoteRequest");
  if (!ipLimit.allowed) return ipLimit.response;

  const declaredLength = Number(req.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_FORM_BYTES) {
    return NextResponse.json(
      { success: false, error: "Demande trop volumineuse." },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, error: "Requête invalide." }, { status: 400 });
  }

  if (stringField(formData, HONEYPOT_FIELD)) {
    await recordSecurityEvent({
      kind: "HONEYPOT_TRIGGERED",
      severity: "medium",
      route: ROUTE,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json(
      { success: false, error: "La soumission n'a pas pu être vérifiée." },
      { status: 422 }
    );
  }
  if (!hasPlausibleFormTiming(stringField(formData, FORM_STARTED_AT_FIELD))) {
    await recordSecurityEvent({
      kind: "FORM_TIMING_REJECTED",
      severity: "low",
      route: ROUTE,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json(
      { success: false, error: "La soumission n'a pas pu être vérifiée." },
      { status: 422 }
    );
  }

  const parsed = QuoteRequestSchema.safeParse({
    interventionType: stringField(formData, "interventionType"),
    roofType: stringField(formData, "roofType"),
    surface: stringField(formData, "surface"),
    isUrgent: stringField(formData, "isUrgent"),
    postalCode: stringField(formData, "postalCode"),
    city: stringField(formData, "city"),
    fullName: stringField(formData, "fullName"),
    phone: stringField(formData, "phone"),
    email: stringField(formData, "email"),
    description: stringField(formData, "description"),
    rgpdConsent: stringField(formData, "rgpdConsent"),
    captchaToken: stringField(formData, "captchaToken"),
  });
  if (!parsed.success) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      route: ROUTE,
      ipAddress: getTrustedIp(req),
      detail: { fields: parsed.error.issues.map((issue) => issue.path.join(".")) },
    });
    return NextResponse.json(
      {
        success: false,
        error: "Veuillez vérifier les champs indiqués.",
        fields: parsed.error.flatten().fieldErrors,
      },
      { status: 422 }
    );
  }
  const rawDraftId = stringField(formData, "draftId");
  const parsedDraftId = rawDraftId ? UuidSchema.safeParse(rawDraftId) : null;
  if (parsedDraftId && !parsedDraftId.success) {
    return NextResponse.json(
      { success: false, error: "Brouillon invalide." },
      { status: 422 }
    );
  }

  const emailLimit = await enforceRateLimit(
    req,
    "quoteRequestPerEmail",
    `email:${parsed.data.email}`
  );
  if (!emailLimit.allowed) return emailLimit.response;

  const turnstile = await verifyTurnstile(parsed.data.captchaToken, getTrustedIp(req));
  if (turnstile === "failed") {
    return NextResponse.json(
      { success: false, error: "Le contrôle anti-robot n'a pas abouti. Merci de réessayer." },
      { status: 422 }
    );
  }

  const files: { buffer: Buffer; originalName: string }[] = [];
  for (const entry of formData.getAll("attachments")) {
    if (!(entry instanceof File) || entry.size === 0) continue;
    files.push({
      buffer: Buffer.from(await entry.arrayBuffer()),
      originalName: entry.name,
    });
  }

  try {
    const user = await getCurrentUser();
    const created = await submitQuoteRequest({
      input: parsed.data,
      submissionKey,
      userId: user?.id ?? null,
      files,
      draftId: parsedDraftId?.data,
    });
    await recordSecurityEvent({
      kind: "QUOTE_REQUEST_CREATED",
      severity: "info",
      route: ROUTE,
      userId: user?.id ?? null,
      targetTable: "quote_requests",
      targetId: created.id,
      detail: {
        reference: created.reference,
        attachments: created.attachmentCount,
        turnstile,
      },
    });
    return NextResponse.json(
      { success: true, reference: created.reference },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof DuplicateSubmissionError) {
      return NextResponse.json(
        {
          success: false,
          error: "Cette demande a déjà été enregistrée.",
          reference: error.reference,
        },
        { status: 409 }
      );
    }
    if (error instanceof InvalidQuoteDraftError) {
      return NextResponse.json(
        { success: false, error: "Brouillon introuvable ou déjà soumis." },
        { status: 404 }
      );
    }
    if (error instanceof UploadRejected) {
      const status = error.reason === "too-large" || error.reason === "batch-too-large" ? 413 : 422;
      return NextResponse.json({ success: false, error: error.message }, { status });
    }
    await recordSecurityEvent({
      kind: "AUDIT_WRITE_FAILURE",
      severity: "high",
      route: ROUTE,
      detail: { reason: "quote-request-persistence-failed" },
    });
    return NextResponse.json(
      {
        success: false,
        error: "Votre demande n'a pas pu être enregistrée pour le moment. Veuillez réessayer.",
      },
      { status: 503 }
    );
  }
}
