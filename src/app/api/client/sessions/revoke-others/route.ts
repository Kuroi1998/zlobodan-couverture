import { NextRequest } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { revokeOtherSessions } from "@/lib/services/auth-service";
import { logAuditEvent } from "@/lib/services/audit-service";
import { getTrustedIp } from "@/lib/security/request-context";
import { apiError, apiSuccess } from "@/lib/api/responses";

export const dynamic = "force-dynamic";

const ROUTE = "/api/client/sessions/revoke-others";

/**
 * Fermeture des autres sessions du compte.
 *
 * La session à conserver est **celle qui présente la requête**, résolue côté
 * serveur. Elle n'est pas choisie par l'appelant : un identifiant de session
 * accepté depuis le corps permettrait à quelqu'un disposant d'un cookie volé
 * de couper le titulaire légitime et de garder la main.
 */
export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;

  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const { sessionId } = await resolveSession();
  if (!sessionId) return apiError("UNAUTHENTICATED");

  await revokeOtherSessions(auth.user.id, sessionId);

  await logAuditEvent({
    userId: auth.user.id,
    action: "session.others_revoked",
    targetTable: "sessions",
    targetId: auth.user.id,
    ipAddress: getTrustedIp(req) ?? undefined,
  });

  return apiSuccess({
    message: "Vos autres sessions ont été fermées.",
  });
}
