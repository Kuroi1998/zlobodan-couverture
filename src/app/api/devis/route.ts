import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { quoteRequests } from "@/db/schema/quotes";
import { HONEYPOT_FIELD, QuoteRequestSchema } from "@/lib/validations/quote-schemas";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { verifyTurnstile } from "@/lib/auth/turnstile";

export const dynamic = "force-dynamic";

const ROUTE = "/api/devis";
const MAX_FORM_BYTES = 32 * 1024;

/**
 * Réponse unique, quelle que soit l'issue réelle.
 *
 * Elle ne dit ni si un piège a été déclenché, ni si le quota est atteint pour
 * cette adresse : un automate ne doit pas pouvoir déduire de la réponse quel
 * contrôle l'a arrêté.
 */
const ACCEPTED = {
  success: true,
  message:
    "Votre demande de devis a bien été enregistrée. Notre couvreur vous recontacte sous 48 h.",
};

export async function POST(req: NextRequest) {
  const ip = getTrustedIp(req);

  const ipLimit = await enforceRateLimit(req, "quoteRequest");
  if (!ipLimit.allowed) return ipLimit.response;

  const contentLength = Number(req.headers.get("content-length") ?? 0);
  if (contentLength > MAX_FORM_BYTES) {
    return NextResponse.json(
      { success: false, message: "Demande trop volumineuse." },
      { status: 413 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ success: false, message: "Requête invalide." }, { status: 400 });
  }

  // 1. Piège à automates. Réponse de succès simulée.
  if (formData.get(HONEYPOT_FIELD)) {
    await recordSecurityEvent({
      kind: "HONEYPOT_TRIGGERED",
      severity: "medium",
      route: ROUTE,
      ipAddress: ip,
    });
    return NextResponse.json(ACCEPTED, { status: 200 });
  }

  // 2. Validation stricte avant tout accès base.
  const parsed = QuoteRequestSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      route: ROUTE,
      ipAddress: ip,
      // Seuls les noms de champs sont journalisés, jamais les valeurs : elles
      // contiennent nom, téléphone et email.
      detail: { fields: parsed.error.issues.map((i) => i.path.join(".")) },
    });
    return NextResponse.json(
      { success: false, message: "Certains champs sont invalides.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }

  // 3. Plafond par adresse email : empêche que le formulaire serve à inonder
  //    un tiers de messages, indépendamment du nombre d'IP utilisées.
  const emailLimit = await enforceRateLimit(req, "quoteRequestPerEmail", `email:${parsed.data.email}`);
  if (!emailLimit.allowed) {
    await recordSecurityEvent({
      kind: "RATE_LIMIT_EXCEEDED",
      severity: "medium",
      route: ROUTE,
      ipAddress: ip,
      detail: { policy: "quoteRequestPerEmail" },
    });
    // Réponse d'acceptation : ne pas confirmer que cette adresse est ciblée.
    return NextResponse.json(ACCEPTED, { status: 200 });
  }

  // 4. Anti-automate. `not-configured` n'est pas un succès : en développement
  //    il laisse passer, en production `env.ts` a déjà bloqué le démarrage.
  const turnstile = await verifyTurnstile(parsed.data.captchaToken, ip);
  if (turnstile === "failed") {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "medium",
      route: ROUTE,
      ipAddress: ip,
      detail: { control: "turnstile" },
    });
    return NextResponse.json(
      { success: false, message: "Le contrôle anti-robot n'a pas abouti. Merci de réessayer." },
      { status: 400 }
    );
  }

  try {
    const [created] = await db
      .insert(quoteRequests)
      .values({
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        city: parsed.data.city,
        postalCode: parsed.data.postalCode,
        interventionType: parsed.data.interventionType,
        roofType: parsed.data.roofType,
        surface: parsed.data.surface,
        isUrgent: parsed.data.isUrgent,
        description: parsed.data.description || null,
      })
      .returning({ id: quoteRequests.id });

    // Journal sans donnée personnelle : seul l'identifiant interne sort.
    // La version précédente écrivait nom, email, téléphone et description en
    // clair sur la sortie standard, donc dans les journaux d'hébergement.
    await recordSecurityEvent({
      kind: "QUOTE_REQUEST_CREATED",
      severity: "info",
      route: ROUTE,
      targetTable: "quote_requests",
      targetId: created?.id ?? null,
      detail: { turnstile },
    });

    return NextResponse.json(ACCEPTED, { status: 200 });
  } catch {
    return NextResponse.json(
      { success: false, message: "Une erreur est survenue lors de l'enregistrement." },
      { status: 500 }
    );
  }
}
