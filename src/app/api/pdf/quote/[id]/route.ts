import { NextRequest, NextResponse } from "next/server";
import { generateServerPdfHtml } from "@/lib/services/pdfService";
import { findQuoteForPdf } from "@/lib/db/repositories/billing";
import { authorizeResource, denyJson, requireApiUser } from "@/lib/security/guards";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { recordSecurityEvent } from "@/lib/security/security-events";

const ROUTE = "/api/pdf/quote/[id]";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const parsed = parseUuidParam(params.id);
  if (!parsed.ok || !parsed.value) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      route: ROUTE,
      detail: { field: "id", reason: "not-a-uuid" },
    });
    return denyJson(404);
  }

  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  const found = await findQuoteForPdf(parsed.value);
  if (!found) return denyJson(404);

  const denial = await authorizeResource(
    auth.user,
    "download",
    "quote",
    { ownerId: found.ownerId },
    ROUTE
  );
  if (denial) return denial;

  const htmlContent = generateServerPdfHtml(found.document);

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="Devis_${parsed.value}.html"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
