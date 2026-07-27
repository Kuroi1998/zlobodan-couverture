import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { revokeOtherSessions } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { getTrustedIp } from "@/lib/security/request-context";
import { sessionExpiredResponse } from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/sessions/revoke-others";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const count = await revokeOtherSessions(auth.user.id, sessionId);
  await recordSecurityEvent({
    kind: "SESSION_REVOKED",
    severity: "medium",
    userId: auth.user.id,
    sessionId,
    ipAddress: getTrustedIp(req),
    detail: { scope: "others", count },
  });
  return NextResponse.json({
    success: true,
    data: { revoked: count },
    message: "Les autres sessions ont été fermées.",
  });
}
