import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { setupTwoFactor } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { readJsonBody } from "@/lib/security/body";
import { SensitiveAccountActionSchema } from "@/lib/validations/auth-schemas";
import {
  authErrorResponse,
  authValidationResponse,
  sessionExpiredResponse,
} from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/two-factor/setup";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "twoFactorChallenge", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = SensitiveAccountActionSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse();
  try {
    const setup = await setupTwoFactor({
      userId: auth.user.id,
      sessionId,
      ...parsed.data,
    });
    const response = NextResponse.json({ success: true, data: setup });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    return authErrorResponse(error);
  }
}
