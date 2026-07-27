import { NextRequest, NextResponse } from "next/server";
import { resendVerificationEmail } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { ResendVerificationSchema } from "@/lib/validations/auth-schemas";
import { settleNeutralResponse } from "@/lib/security/neutral-response";

const MESSAGE =
  "Si un compte non vérifié correspond à cette adresse, un nouvel e-mail a été envoyé.";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const limit = await enforceRateLimit(req, "emailVerification");
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = ResendVerificationSchema.safeParse(body.value);
  if (parsed.success) {
    await resendVerificationEmail(parsed.data.email, getTrustedIp(req)).catch(
      () => undefined
    );
  }
  await settleNeutralResponse(startedAt);
  return NextResponse.json({ success: true, message: MESSAGE }, { status: 202 });
}
