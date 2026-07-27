import { NextRequest, NextResponse } from "next/server";
import { confirmEmailChange } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { ConfirmEmailChangeSchema } from "@/lib/validations/auth-schemas";
import { authErrorResponse, authValidationResponse } from "@/lib/api/auth-responses";

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit(req, "emailVerification");
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = ConfirmEmailChangeSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse("Lien invalide.");
  try {
    await confirmEmailChange({
      token: parsed.data.token,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json({
      success: true,
      message: "Adresse modifiée. Reconnectez-vous avec la nouvelle adresse.",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
