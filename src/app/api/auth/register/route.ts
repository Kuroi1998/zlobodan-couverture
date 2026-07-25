import { NextRequest, NextResponse } from "next/server";
import { RegisterSchema } from "@/lib/validations/auth-schemas";
import { registerUser } from "@/lib/services/auth-service";
import { toPublicAuthError } from "@/lib/services/auth-errors";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { readJsonBody } from "@/lib/security/body";

export const dynamic = "force-dynamic";

/**
 * Réponse unique de l'inscription.
 *
 * Elle ne varie ni selon l'existence du compte, ni selon l'issue réelle : c'est
 * la condition pour que ce point ne serve pas à énumérer la clientèle. Le
 * `userId` renvoyé par la version précédente a été retiré pour la même raison.
 */
const NEUTRAL_RESPONSE = {
  success: true,
  message:
    "Si cette adresse peut être utilisée, un email de vérification vient d'être envoyé. " +
    "Pensez à consulter vos courriers indésirables.",
};

export async function POST(req: NextRequest) {
  const limit = await enforceRateLimit(req, "register");
  if (!limit.allowed) return limit.response;

  const body = await readJsonBody(req);
  if (!body.ok) return body.response;

  const parsed = RegisterSchema.safeParse(body.value);
  if (!parsed.success) {
    // La politique de mot de passe reste explicite : l'utilisateur doit pouvoir
    // corriger sa saisie, et cette information ne révèle rien sur autrui.
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { success: false, error: first?.message ?? "Données invalides." },
      { status: 400 }
    );
  }

  try {
    await registerUser({
      email: parsed.data.email,
      password: parsed.data.password,
      phone: parsed.data.phone,
      ipAddress: getTrustedIp(req),
    });
    return NextResponse.json(NEUTRAL_RESPONSE, { status: 202 });
  } catch (error) {
    const safe = toPublicAuthError(error);
    // Les refus de politique de mot de passe restent explicites (400) ; tout
    // le reste retombe sur la réponse neutre.
    if (safe.status === 400) {
      return NextResponse.json({ success: false, error: safe.message }, { status: 400 });
    }
    return NextResponse.json(NEUTRAL_RESPONSE, { status: 202 });
  }
}
