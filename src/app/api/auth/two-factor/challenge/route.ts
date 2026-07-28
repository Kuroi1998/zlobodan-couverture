import { NextRequest, NextResponse } from "next/server";
import {
  getChallengeTokenFromCookie,
  getClearedChallengeCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  TWO_FACTOR_CHALLENGE_COOKIE_NAME,
} from "@/lib/auth/session";
import { TwoFactorChallengeSchema } from "@/lib/validations/auth-schemas";
import { completeTwoFactorLogin } from "@/lib/services/auth-service";
import { toPublicAuthError } from "@/lib/services/auth-errors";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { readJsonBody } from "@/lib/security/body";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit(req, "twoFactorChallenge");
  if (!limit.allowed) return limit.response;
  const challengeToken = await getChallengeTokenFromCookie();
  if (!challengeToken) {
    return NextResponse.json(
      { success: false, code: "CHALLENGE_FAILED", error: "Le défi a expiré." },
      { status: 401 }
    );
  }

  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = TwoFactorChallengeSchema.safeParse(body.value);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, code: "INVALID_TWO_FACTOR_CODE", error: "Code invalide." },
      { status: 422 }
    );
  }

  try {
    const result = await completeTwoFactorLogin({
      challengeToken,
      code: parsed.data.code,
      method: parsed.data.method,
    });
    const response = NextResponse.json({
      success: true,
      destination: result.destination,
    });
    response.cookies.set(
      SESSION_COOKIE_NAME,
      result.session.token,
      getSessionCookieOptions(result.session.maxAgeSeconds)
    );
    response.cookies.set(
      TWO_FACTOR_CHALLENGE_COOKIE_NAME,
      "",
      getClearedChallengeCookieOptions()
    );
    return response;
  } catch (error) {
    const safe = toPublicAuthError(error);
    return NextResponse.json(
      { success: false, code: safe.code, error: safe.message },
      { status: safe.status }
    );
  }
}
