import { NextRequest, NextResponse } from "next/server";
import { generateServerPdfHtml } from "@/lib/services/pdfService";
import { findInvoiceForPdf } from "@/lib/db/repositories/billing";
import { authorizeResource, denyJson, requireApiUser } from "@/lib/security/guards";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { recordSecurityEvent } from "@/lib/security/security-events";

const ROUTE = "/api/pdf/invoice/[id]";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  // 1. Format d'identifiant validé avant toute requête base.
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

  // 2. Authentification.
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  // 3. Chargement, puis contrôle d'appartenance sur le propriétaire réel.
  const found = await findInvoiceForPdf(parsed.value);
  if (!found) return denyJson(404);

  const denial = await authorizeResource(
    auth.user,
    "download",
    "invoice",
    { ownerId: found.ownerId },
    ROUTE
  );
  if (denial) return denial;

  // 4. Rendu à partir des seules données issues de la base.
  const htmlContent = generateServerPdfHtml(found.document);

  return new NextResponse(htmlContent, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      // Nom de fichier construit sur l'UUID validé, jamais sur une entrée
      // utilisateur : ferme l'injection d'en-tête et le path traversal.
      "Content-Disposition": `inline; filename="Facture_${parsed.value}.html"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
