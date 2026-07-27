import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { CancelQuoteRequestSchema } from "@/lib/validations/account-schemas";
import { cancelQuoteRequest } from "@/lib/services/client-portal-service";
import { quoteRequestClientLabel } from "@/domain/request-labels";
import { apiError, apiSuccess } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

const ROUTE = "/api/client/demandes/[reference]/cancel";

/**
 * Annulation d'une demande par son propriétaire.
 *
 * La référence est reprise du segment d'URL, mais elle est validée par le même
 * schéma que le corps avant d'atteindre la base — et elle n'est de toute façon
 * jamais suffisante : le service la conjugue à l'identifiant de session dans
 * la clause `where`. Une référence appartenant à un autre client est donc
 * « introuvable », sans que la réponse permette de distinguer les deux cas.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ reference: string }> }
) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  const limit = await enforceRateLimit(req, "requestCancel", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const body = await readJsonBody(req, 2 * 1024);
  if (!body.ok) return body.response;

  const candidate =
    typeof body.value === "object" && body.value !== null && !Array.isArray(body.value)
      ? { ...body.value, reference: (await params).reference }
      : { reference: (await params).reference };

  const parsed = CancelQuoteRequestSchema.safeParse(candidate);
  if (!parsed.success) {
    // Une référence mal formée ne mérite pas de détail : elle ne peut désigner
    // aucune ressource, la réponse est donc la même que pour une inexistante.
    return apiError("NOT_FOUND");
  }

  const result = await cancelQuoteRequest({
    ownerId: auth.user.id,
    reference: parsed.data.reference,
    reason: parsed.data.reason,
  });

  switch (result.outcome) {
    case "cancelled":
      return apiSuccess({
        reference: result.reference,
        status: "cancelled",
        message: `Demande ${result.reference} annulée.`,
      });
    case "not-found":
      return apiError("NOT_FOUND");
    case "not-cancellable":
      return apiError("CONFLICT", {
        message: `Cette demande ne peut plus être annulée (état actuel : ${quoteRequestClientLabel(
          result.status
        )}).`,
      });
  }
}
