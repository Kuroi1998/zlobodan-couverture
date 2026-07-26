import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { QuoteRequestWorkflowUpdateSchema } from "@/lib/validations/workflow-schemas";
import { changeQuoteRequestStatus } from "@/lib/services/quote-request-service";
import { recordSecurityEvent } from "@/lib/security/security-events";

export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/devis/[id]/status";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireApiRole(ROUTE, ["staff", "admin"]);
  if (!auth.ok) return auth.response;

  const parsedId = parseUuidParam((await params).id);
  if (!parsedId.ok || !parsedId.value) {
    return NextResponse.json({ success: false, error: "Ressource introuvable." }, { status: 404 });
  }

  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = QuoteRequestWorkflowUpdateSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Mise à jour invalide." },
      { status: 422 }
    );
  }

  try {
    await changeQuoteRequestStatus({
      quoteRequestId: parsedId.value,
      newStatus: parsed.data.status,
      changedByUserId: auth.user.id,
      reason: parsed.data.reason,
      internalNotes: parsed.data.internalNotes,
      assignedToUserId: parsed.data.assignedToUserId,
    });
    await recordSecurityEvent({
      kind: "QUOTE_REQUEST_STATUS_CHANGED",
      severity: "info",
      userId: auth.user.id,
      route: ROUTE,
      targetTable: "quote_requests",
      targetId: parsedId.value,
      detail: {
        status: parsed.data.status,
        assignedToUserId: parsed.data.assignedToUserId ?? null,
      },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message === "QUOTE_REQUEST_NOT_FOUND") {
      return NextResponse.json({ success: false, error: "Ressource introuvable." }, { status: 404 });
    }
    if (message === "QUOTE_ASSIGNEE_INVALID") {
      return NextResponse.json(
        { success: false, error: "Responsable invalide." },
        { status: 422 }
      );
    }
    if (message === "QUOTE_ACTOR_FORBIDDEN") {
      return NextResponse.json(
        { success: false, error: "Action interdite." },
        { status: 403 }
      );
    }
    if (
      message === "QUOTE_REQUEST_TRANSITION_FORBIDDEN" ||
      message === "QUOTE_REQUEST_CONFLICT"
    ) {
      return NextResponse.json(
        { success: false, error: "Le statut a changé ou cette transition est interdite." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Mise à jour temporairement indisponible." },
      { status: 500 }
    );
  }
}
