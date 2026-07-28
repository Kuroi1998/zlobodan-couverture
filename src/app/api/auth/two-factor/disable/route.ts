import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { removeTwoFactor } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { DisableTwoFactorSchema } from "@/lib/validations/auth-schemas";
import {
  authErrorResponse,
  authValidationResponse,
  sessionExpiredResponse,
} from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/two-factor/disable";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "twoFactorChallenge", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = DisableTwoFactorSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse();
  try {
    await removeTwoFactor({
      userId: auth.user.id,
      sessionId,
      ...parsed.data,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json({ success: true, message: "2FA désactivée." });
  } catch (error) {
    return authErrorResponse(error);
  }
}
