import { NextRequest, NextResponse } from "next/server";
import { LoginSchema } from "@/lib/validations/auth-schemas";
import { loginUser } from "@/lib/services/auth-service";
import { toPublicAuthError } from "@/lib/services/auth-errors";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp, getUserAgent } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";
import { recordSecurityEvent } from "@/lib/security/security-events";

export const dynamic = "force-dynamic";

const ROUTE = "/api/auth/login";

export async function POST(req: NextRequest) {
  // Limitation par IP d'abord : elle s'applique même à un corps invalide,
  // sinon le forçage se ferait à coût nul en envoyant du JSON malformé.
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
      detail: { fields: parsed.error.issues.map((i) => i.path.join(".")) },
    });
    // Message générique : un détail de validation distinguerait « email
    // inexistant » de « email mal formé ».
    return NextResponse.json(
      { success: false, error: "Identifiants incorrects, ou compte momentanément indisponible." },
      { status: 401 }
    );
  }

  // Second compteur, par compte : empêche de répartir le forçage sur un parc
  // d'adresses IP sans jamais atteindre le seuil de l'une d'elles.
  const accountLimit = await enforceRateLimit(req, "login", `account:${parsed.data.email}`);
  if (!accountLimit.allowed) return accountLimit.response;

  try {
    const { user } = await loginUser({
      email: parsed.data.email,
      password: parsed.data.password,
      totpCode: parsed.data.totpCode,
      captchaToken: parsed.data.captchaToken,
      ipAddress: getTrustedIp(req),
      userAgent: getUserAgent(req),
    });

    return NextResponse.json({
      success: true,
      user: { id: user.id, email: user.email, role: user.role },
    });
  } catch (error) {
    const safe = toPublicAuthError(error);
    return NextResponse.json(
      { success: false, error: safe.message, code: safe.code },
      { status: safe.status }
    );
  }
}
