import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireApiUser } from "@/lib/security/guards";
import { getCurrentUser } from "@/lib/security/session-guard";
import { readJsonBody } from "@/lib/security/body";
import { readIdempotencyHeader } from "@/lib/security/idempotency";
import { UuidSchema } from "@/lib/validations/identifiers";
import { QuoteDraftSchema } from "@/lib/validations/quote-schemas";
import {
  deleteQuoteDraft,
  getLatestQuoteDraft,
  QuoteDraftNotFoundError,
  saveQuoteDraft,
} from "@/lib/services/quote-draft-service";

export const dynamic = "force-dynamic";
const ROUTE = "/api/devis/draft";
const DraftMutationSchema = z
  .object({
    draftId: UuidSchema.optional(),
    data: QuoteDraftSchema,
  })
  .strict();

export async function GET(): Promise<NextResponse> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({
      success: true,
      authenticated: false,
      draft: null,
    });
  }
  const draft = await getLatestQuoteDraft(user.id);
  return NextResponse.json({ success: true, authenticated: true, draft });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const submissionKey = readIdempotencyHeader(req.headers);
  if (!submissionKey) {
    return NextResponse.json(
      { success: false, error: "Clé de soumission absente ou invalide." },
      { status: 400 }
    );
  }
  const body = await readJsonBody(req, 16 * 1024);
  if (!body.ok) return body.response;
  const parsed = DraftMutationSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Brouillon invalide." },
      { status: 422 }
    );
  }
  try {
    const saved = await saveQuoteDraft({
      draftId: parsed.data.draftId,
      submissionKey,
      userId: auth.user.id,
      input: parsed.data.data,
    });
    return NextResponse.json({ success: true, draft: saved });
  } catch (error) {
    if (error instanceof QuoteDraftNotFoundError) {
      return NextResponse.json(
        { success: false, error: "Brouillon introuvable." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Brouillon temporairement indisponible." },
      { status: 503 }
    );
  }
}

export async function DELETE(req: NextRequest): Promise<NextResponse> {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = z.object({ draftId: UuidSchema }).strict().safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Identifiant invalide." },
      { status: 422 }
    );
  }
  try {
    await deleteQuoteDraft(parsed.data.draftId, auth.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof QuoteDraftNotFoundError) {
      return NextResponse.json(
        { success: false, error: "Brouillon introuvable." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Suppression temporairement indisponible." },
      { status: 503 }
    );
  }
}
