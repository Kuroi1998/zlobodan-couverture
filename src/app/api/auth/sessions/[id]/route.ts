import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { revokeOwnedSession } from "@/lib/services/auth-service";
import {
  getClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { getTrustedIp } from "@/lib/security/request-context";

const ROUTE = "/api/auth/sessions/[id]";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(id)) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Session introuvable." } },
      { status: 404 }
    );
  }
  const { sessionId } = await resolveSession();
  const revoked = await revokeOwnedSession(auth.user.id, id);
  if (!revoked) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Session introuvable." } },
      { status: 404 }
    );
  }
  await recordSecurityEvent({
    kind: "SESSION_REVOKED",
    severity: "medium",
    userId: auth.user.id,
    sessionId: id,
    ipAddress: getTrustedIp(req),
    detail: { current: id === sessionId },
  });
  const response = new NextResponse(null, { status: 204 });
  if (id === sessionId) {
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getClearedSessionCookieOptions()
    );
  }
  return response;
}
