import { NextRequest, NextResponse } from "next/server";
import { changePassword } from "@/lib/services/auth-service";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { ChangePasswordSchema } from "@/lib/validations/auth-schemas";
import {
  authErrorResponse,
  authValidationResponse,
  sessionExpiredResponse,
} from "@/lib/api/auth-responses";

const ROUTE = "/api/auth/change-password";

export async function POST(req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const session = await resolveSession();
  if (!session.sessionId) return sessionExpiredResponse();
  const limit = await enforceRateLimit(req, "accountUpdate", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = ChangePasswordSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse(parsed.error.issues[0]?.message);
  try {
    await changePassword({
      userId: auth.user.id,
      sessionId: session.sessionId,
      ...parsed.data,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json({ success: true, message: "Mot de passe modifié." });
  } catch (error) {
    return authErrorResponse(error);
  }
}
