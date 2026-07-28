import { NextRequest, NextResponse } from "next/server";
import { verifyEmailToken } from "@/lib/services/auth-service";
import { authErrorResponse, authValidationResponse } from "@/lib/api/auth-responses";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { ConfirmEmailChangeSchema } from "@/lib/validations/auth-schemas";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit(req, "emailVerification");
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = ConfirmEmailChangeSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse("Lien de vérification invalide.");
  try {
    await verifyEmailToken(parsed.data.token, getTrustedIp(req));
    return NextResponse.json({
      success: true,
      message: "Votre adresse e-mail est vérifiée. Vous pouvez vous connecter.",
    });
  } catch (error) {
    return authErrorResponse(error);
  }
}
