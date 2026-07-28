import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { revokeAllSessions } from "@/lib/services/auth-service";
import { verifySensitiveAction } from "@/lib/services/auth/reauthentication-service";
import { queueAuthEmail } from "@/lib/services/auth-email-service";
import {
  getClearedSessionCookieOptions,
  SESSION_COOKIE_NAME,
} from "@/lib/auth/session";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { SensitiveAccountActionSchema } from "@/lib/validations/auth-schemas";
import {
  authErrorResponse,
  authValidationResponse,
  sessionExpiredResponse,
} from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/sessions/revoke-all";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = SensitiveAccountActionSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse();
  try {
    await verifySensitiveAction({
      userId: auth.user.id,
      sessionId,
      ...parsed.data,
    });
    const count = await revokeAllSessions(auth.user.id);
    await queueAuthEmail({
      kind: "auth.sessions_revoked",
      userId: auth.user.id,
      recipient: auth.user.email,
    });
    await recordSecurityEvent({
      kind: "SESSION_REVOKED",
      severity: "high",
      userId: auth.user.id,
      sessionId,
      ipAddress: getTrustedIp(req),
      detail: { scope: "all", count },
    });
    const response = NextResponse.json({
      success: true,
      message: "Toutes les sessions ont été fermées.",
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      "",
      getClearedSessionCookieOptions()
    );
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
