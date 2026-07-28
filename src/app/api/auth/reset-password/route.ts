import { NextRequest, NextResponse } from "next/server";
import { resetPassword } from "@/lib/services/auth-service";
import { authErrorResponse, authValidationResponse } from "@/lib/api/auth-responses";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { PasswordResetConfirmSchema } from "@/lib/validations/auth-schemas";

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit(req, "passwordReset");
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = PasswordResetConfirmSchema.safeParse(body.value);
  if (!parsed.success) {
    return authValidationResponse(parsed.error.issues[0]?.message);
  }
  try {
    await resetPassword({
      token: parsed.data.token,
      newPassword: parsed.data.newPassword,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json({
      success: true,
      message: "Mot de passe réinitialisé. Toutes les sessions ont été fermées.",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
