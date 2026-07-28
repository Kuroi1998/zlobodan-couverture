import { NextRequest, NextResponse } from "next/server";
import { ContactMessageSchema, CONTACT_HONEYPOT_FIELD } from "@/lib/validations/contact-schemas";
import { readJsonBody } from "@/lib/security/body";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { readIdempotencyHeader } from "@/lib/security/idempotency";
import { verifyTurnstile } from "@/lib/auth/turnstile";
import { getCurrentUser } from "@/lib/security/session-guard";
import { createContactMessage } from "@/lib/services/contact-service";
import { DuplicateSubmissionError } from "@/lib/services/submission-errors";
import {
  FORM_STARTED_AT_FIELD,
  hasPlausibleFormTiming,
} from "@/lib/security/form-timing";

export const dynamic = "force-dynamic";

const ROUTE = "/api/contact";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  if (!req.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
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

  const limit = await enforceRateLimit(req, "contactMessage");
  if (!limit.allowed) return limit.response;

  const body = await readJsonBody(req, 16 * 1024);
  if (!body.ok) return body.response;
  if (!isRecord(body.value)) {
    return NextResponse.json({ success: false, error: "Requête invalide." }, { status: 400 });
  }

  if (body.value[CONTACT_HONEYPOT_FIELD]) {
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
  if (!hasPlausibleFormTiming(body.value[FORM_STARTED_AT_FIELD])) {
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

  const candidate = { ...body.value };
  delete candidate[CONTACT_HONEYPOT_FIELD];
  delete candidate[FORM_STARTED_AT_FIELD];
  const parsed = ContactMessageSchema.safeParse(candidate);
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

  const emailLimit = await enforceRateLimit(
    req,
    "contactMessagePerEmail",
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

  try {
    const user = await getCurrentUser();
    const created = await createContactMessage({
      input: parsed.data,
      submissionKey,
      userId: user?.id ?? null,
    });
    await recordSecurityEvent({
      kind: "CONTACT_MESSAGE_CREATED",
      severity: "info",
      route: ROUTE,
      userId: user?.id ?? null,
      targetTable: "contact_messages",
      targetId: created.id,
      detail: { reference: created.reference, turnstile },
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
    await recordSecurityEvent({
      kind: "AUDIT_WRITE_FAILURE",
      severity: "high",
      route: ROUTE,
      detail: { reason: "contact-persistence-failed" },
    });
    return NextResponse.json(
      {
        success: false,
        error: "Votre message n'a pas pu être enregistré pour le moment. Veuillez réessayer.",
      },
      { status: 503 }
    );
  }
}
