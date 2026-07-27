import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validations/auth-schemas";
import {
  beginLogin,
  completeTwoFactorLogin,
} from "@/lib/services/auth-service";
import {
  GENERIC_CREDENTIALS,
  toPublicAuthError,
} from "@/lib/services/auth-errors";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp, getUserAgent } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { recordSecurityEvent } from "@/lib/security/security-events";
import {
  getChallengeCookieOptions,
  getClearedChallengeCookieOptions,
  getSessionCookieOptions,
  SESSION_COOKIE_NAME,
  TWO_FACTOR_CHALLENGE_COOKIE_NAME,
} from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const ROUTE = "/api/auth/login";

function authenticatedResponse(result: {
  user: { id: string; email: string; role: string };
  session: { token: string; maxAgeSeconds: number };
  destination: string;
}): NextResponse {
  const response = NextResponse.json({
    success: true,
    destination: result.destination,
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
    },
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
}

export async function POST(req: NextRequest) {
  const ipLimit = await enforceRateLimit(req, "login");
  if (!ipLimit.allowed) return ipLimit.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;
  const parsed = LoginSchema.safeParse(body.value);
  if (!parsed.success) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      route: ROUTE,
      ipAddress: getTrustedIp(req),
      detail: { fields: parsed.error.issues.map((issue) => issue.path.join(".")) },
    });
    return NextResponse.json(
      { success: false, error: GENERIC_CREDENTIALS },
      { status: 401 }
    );
  }

  const accountLimit = await enforceRateLimit(
    req,
    "login",
    `account:${parsed.data.email}`
  );
  if (!accountLimit.allowed) return accountLimit.response;

  try {
    const result = await beginLogin({
      email: parsed.data.email,
      password: parsed.data.password,
      captchaToken: parsed.data.captchaToken,
      requestedPath: parsed.data.next,
      ipAddress: getTrustedIp(req),
      userAgent: getUserAgent(req),
    });

    if (result.kind === "authenticated") {
      return authenticatedResponse(result);
    }

    const suppliedCode = parsed.data.recoveryCode ?? parsed.data.totpCode;
    if (suppliedCode) {
      const completed = await completeTwoFactorLogin({
        challengeToken: result.challengeToken,
        code: suppliedCode,
        method: parsed.data.recoveryCode ? "recovery" : "totp",
      });
      return authenticatedResponse(completed);
    }

    const response = NextResponse.json(
      {
        success: false,
        code: "TWO_FACTOR_REQUIRED",
        message: "Saisissez le code de votre application ou un code de récupération.",
      },
      { status: 202 }
    );
    response.cookies.set(
      TWO_FACTOR_CHALLENGE_COOKIE_NAME,
      result.challengeToken,
      getChallengeCookieOptions(
        Math.max(1, Math.floor((result.expiresAt.getTime() - Date.now()) / 1000))
      )
    );
    return response;
  } catch (error) {
    const safe = toPublicAuthError(error);
    if (safe.code === "UNEXPECTED_AUTH_ERROR") {
      await recordSecurityEvent({
        kind: "LOGIN_FAILED",
        severity: "high",
        route: ROUTE,
        ipAddress: getTrustedIp(req),
        detail: { reason: "unexpected-auth-error" },
      });
    }
    return NextResponse.json(
      { success: false, error: safe.message, code: safe.code },
      { status: safe.status }
    );
  }
}
