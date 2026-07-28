import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { activateTwoFactor } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { ConfirmTwoFactorSetupSchema } from "@/lib/validations/auth-schemas";
import {
  authErrorResponse,
  authValidationResponse,
  sessionExpiredResponse,
} from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/two-factor/confirm";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "twoFactorChallenge", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = ConfirmTwoFactorSetupSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse();
  try {
    const recoveryCodes = await activateTwoFactor({
      userId: auth.user.id,
      sessionId,
      code: parsed.data.code,
      ipAddress: getTrustedIp(req),
    });
    const response = NextResponse.json({
      success: true,
      data: { recoveryCodes },
      message: "2FA activée. Enregistrez maintenant les codes de récupération.",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
