import { NextRequest, NextResponse } from "next/server";
import { requestPasswordReset } from "@/lib/services/auth-service";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { PasswordResetRequestSchema } from "@/lib/validations/auth-schemas";
import { settleNeutralResponse } from "@/lib/security/neutral-response";

const MESSAGE =
  "Si un compte correspond à cette adresse, un e-mail de réinitialisation a été envoyé.";

export async function POST(req: NextRequest) {
  const startedAt = Date.now();
  const limit = await enforceRateLimit(req, "passwordReset");
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 4 * 1024);
  if (!body.ok) return body.response;
  const parsed = PasswordResetRequestSchema.safeParse(body.value);
  if (parsed.success) {
    await requestPasswordReset(parsed.data.email, getTrustedIp(req)).catch(
      () => undefined
    );
  }
  await settleNeutralResponse(startedAt);
  return NextResponse.json({ success: true, message: MESSAGE }, { status: 202 });
}
