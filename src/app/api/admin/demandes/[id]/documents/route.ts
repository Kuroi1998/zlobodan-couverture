import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteRequests } from "@/db/schema/quotes";
import { requireApiRole } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { recordSecurityEvent } from "@/lib/security/security-events";
import {
  DocumentGenerationError,
  generateQuoteRequestSummary,
} from "@/lib/documents/generate";
import { GenerateDocumentSchema } from "@/lib/validations/document-schemas";

export const dynamic = "force-dynamic";

const ROUTE = "/api/admin/demandes/[id]/documents";

/**
 * Génération du récapitulatif d'une demande.
 *
 * Le corps de la requête ne porte que des **intentions** : le type de document
 * et l'envie de forcer une nouvelle version. Aucune donnée imprimée — nom du
 * client, montants, statut — n'y transite : tout est relu depuis PostgreSQL par
 * le service. Un navigateur ne peut donc pas fabriquer un document au contenu
 * choisi.
 *
 * De même, ni le propriétaire, ni la clé de stockage, ni la référence ne sont
 * acceptés depuis l'extérieur : ils sont déterminés côté serveur.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const auth = await requireApiRole(ROUTE, ["staff", "admin"]);
  if (!auth.ok) return auth.response;

  const parsedId = parseUuidParam((await params).id);
  if (!parsedId.ok || !parsedId.value) {
    return NextResponse.json(
      { success: false, error: "Ressource introuvable." },
      { status: 404 }
    );
  }

  const limit = await enforceRateLimit(
    req,
    "documentGeneration",
    `user:${auth.user.id}`
  );
  if (!limit.allowed) return limit.response;

  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = GenerateDocumentSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: "Demande de génération invalide." },
      { status: 422 }
    );
  }

  // Moindre privilège : appartenir au pôle ne suffit pas, il faut être
  // l'opérateur affecté à ce dossier. L'administration reste libre de générer
  // sur n'importe quel dossier, c'est le rôle qui en répond.
  const rows = await db
    .select({ assignedToUserId: quoteRequests.assignedToUserId })
    .from(quoteRequests)
    .where(eq(quoteRequests.id, parsedId.value))
    .limit(1);

  const request = rows[0];
  if (!request) {
    return NextResponse.json(
      { success: false, error: "Ressource introuvable." },
      { status: 404 }
    );
  }

  if (auth.user.role === "staff" && request.assignedToUserId !== auth.user.id) {
    await recordSecurityEvent({
      kind: "ACCESS_DENIED_OWNERSHIP",
      severity: "high",
      userId: auth.user.id,
      route: ROUTE,
      targetTable: "quote_requests",
      targetId: parsedId.value,
      detail: { action: "generate" },
    });
    return NextResponse.json(
      { success: false, error: "Ressource introuvable." },
      { status: 404 }
    );
  }

  try {
    const result = await generateQuoteRequestSummary({
      quoteRequestId: parsedId.value,
      actorUserId: auth.user.id,
      force: parsed.data.force,
    });

    // 200 sur réutilisation, 201 sur création : la distinction dit à l'appelant
    // si une version a réellement été ajoutée, sans qu'il ait à comparer les
    // numéros.
    return NextResponse.json(
      {
        success: true,
        document: {
          publicId: result.publicId,
          reference: result.reference,
          versionNumber: result.versionNumber,
          checksum: result.checksum,
          sizeBytes: result.sizeBytes,
        },
      },
      { status: result.reused ? 200 : 201 }
    );
  } catch (error) {
    if (error instanceof DocumentGenerationError) {
      switch (error.failure) {
        case "request-not-found":
          return NextResponse.json(
            { success: false, error: "Ressource introuvable." },
            { status: 404 }
          );
        case "no-owner":
          // La demande existe mais n'a pas de titulaire : c'est une donnée
          // incomplète, pas une panne. 422 le dit sans révéler autre chose.
          return NextResponse.json(
            {
              success: false,
              error:
                "Cette demande n'est rattachée à aucun compte client ; le document ne peut pas lui être attribué.",
            },
            { status: 422 }
          );
        case "storage-failed":
        case "publish-failed":
          return NextResponse.json(
            { success: false, error: "Le document est temporairement indisponible." },
            { status: 503 }
          );
        case "render-failed":
          return NextResponse.json(
            { success: false, error: "Le document n'a pas pu être généré pour le moment." },
            { status: 500 }
          );
      }
    }

    return NextResponse.json(
      { success: false, error: "Le document n'a pas pu être généré pour le moment." },
      { status: 500 }
    );
  }
}
