import { NextRequest, NextResponse } from "next/server";
import { denyJson, requireApiUser } from "@/lib/security/guards";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { resolveDocumentForDelivery } from "@/lib/documents/access";
import { logAuditEvent } from "@/lib/services/audit-service";
import { getTrustedIp } from "@/lib/security/request-context";
import { parseVersionParam, pdfResponseHeaders } from "@/lib/documents/http";

export const dynamic = "force-dynamic";

const ROUTE = "/api/documents/[publicId]/preview";

/**
 * Consultation d'un document dans le navigateur.
 *
 * Même résolution, mêmes règles d'autorisation et mêmes en-têtes que le
 * téléchargement : seule la disposition change, `inline` au lieu de
 * `attachment`. C'est volontairement le même chemin de code — une
 * prévisualisation « allégée » est le moyen le plus courant de rouvrir un accès
 * qu'on croyait fermé.
 *
 * Le PDF est servi depuis cette origine mais neutralisé par
 * `default-src 'none'; sandbox` : un fichier embarquant du JavaScript ou une
 * ressource distante ne peut rien exécuter ni rien joindre.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ publicId: string }> }
): Promise<NextResponse> {
  const { publicId } = await params;
  const parsed = parseUuidParam(publicId);
  if (!parsed.ok || !parsed.value) return denyJson(404);

  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  const limit = await enforceRateLimit(
    req,
    "documentDownload",
    `user:${auth.user.id}`
  );
  if (!limit.allowed) return limit.response;

  const version = parseVersionParam(req.nextUrl.searchParams.get("version"));
  if (version === "invalid") return denyJson(404);

  const resolved = await resolveDocumentForDelivery({
    publicId: parsed.value,
    user: auth.user,
    action: "view",
    versionNumber: version,
  });

  if (!resolved.ok) {
    return resolved.failure === "unavailable"
      ? NextResponse.json(
          { success: false, error: "Le document est temporairement indisponible." },
          { status: 503 }
        )
      : denyJson(404);
  }

  await logAuditEvent({
    userId: auth.user.id,
    action: "document.viewed",
    targetTable: "documents",
    targetId: resolved.document.id,
    diff: {
      reference: resolved.document.reference,
      version: resolved.version.versionNumber,
    },
    ipAddress: getTrustedIp(req) ?? undefined,
  });

  return new NextResponse(new Uint8Array(resolved.bytes), {
    headers: pdfResponseHeaders(resolved.fileName, resolved.bytes.length, "inline"),
  });
}
