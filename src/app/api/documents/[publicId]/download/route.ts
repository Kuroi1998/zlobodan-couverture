import { NextRequest, NextResponse } from "next/server";
import { denyJson, requireApiUser } from "@/lib/security/guards";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { resolveDocumentForDelivery } from "@/lib/documents/access";
import { logAuditEvent } from "@/lib/services/audit-service";
import { getTrustedIp } from "@/lib/security/request-context";
import { parseVersionParam, pdfResponseHeaders } from "@/lib/documents/http";

export const dynamic = "force-dynamic";

const ROUTE = "/api/documents/[publicId]/download";

/**
 * Téléchargement d'un document.
 *
 * L'ordre est délibéré : identifiant validé, session, débit, puis résolution —
 * qui porte l'autorisation. Vérifier le format avant d'ouvrir une session
 * évite qu'une chaîne quelconque atteigne la base ; vérifier la session avant
 * le débit évite qu'un anonyme consomme le quota d'un compte.
 *
 * Aucune redirection vers le stockage : les octets transitent par cette route,
 * ce qui garantit qu'ils ne sont jamais servis sans contrôle. C'est aussi ce
 * qui permet de journaliser le téléchargement — impossible derrière une
 * redirection vers une URL signée.
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
    action: "download",
    versionNumber: version,
  });

  if (!resolved.ok) {
    // Panne de stockage et document introuvable sont distingués ici, et
    // seulement ici : 503 dit « revenez plus tard », 404 dit « rien à voir ».
    // Confondre les deux ferait croire à une suppression lors d'un incident.
    return resolved.failure === "unavailable"
      ? NextResponse.json(
          { success: false, error: "Le document est temporairement indisponible." },
          { status: 503 }
        )
      : denyJson(404);
  }

  // Journalisé après lecture réussie et avant émission : un téléchargement est
  // un accès à une donnée personnelle et doit laisser une trace nominative.
  // Ni la clé de stockage ni le contenu n'entrent dans le journal.
  await logAuditEvent({
    userId: auth.user.id,
    action: "document.downloaded",
    targetTable: "documents",
    targetId: resolved.document.id,
    diff: {
      reference: resolved.document.reference,
      version: resolved.version.versionNumber,
      bytes: resolved.bytes.length,
    },
    ipAddress: getTrustedIp(req) ?? undefined,
  });

  return new NextResponse(new Uint8Array(resolved.bytes), {
    headers: pdfResponseHeaders(resolved.fileName, resolved.bytes.length, "attachment"),
  });
}
