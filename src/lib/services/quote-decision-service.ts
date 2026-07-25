import { NextRequest, NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quotes } from "@/db/schema/quotes";
import { findQuoteForDecision } from "@/lib/db/repositories/billing";
import { authorizeResource, denyJson, requireApiUser } from "@/lib/security/guards";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { getTrustedIp } from "@/lib/security/request-context";
import { canTransitionQuote, isQuoteAcceptable } from "@/lib/domain/state-machine";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { hashIpAddress } from "@/lib/auth/session";
import { logAuditEvent } from "./audit-service";

/**
 * Acceptation et refus de devis.
 *
 * Ces routes matérialisent un engagement contractuel. Avant durcissement,
 * elles écrivaient une « signature » horodatée sans aucune identité : un tiers
 * pouvait accepter un devis à cinq chiffres à la place du client, ou le
 * refuser pour saboter l'affaire (audit C5).
 *
 * Quatre conditions doivent désormais être réunies : session valide,
 * identifiant bien formé, appartenance du devis, et transition d'état légale.
 */

export type QuoteDecision = "accept" | "refuse";

/** Seul un devis envoyé et non encore tranché peut l'être. */
const DECIDABLE_STATUS = "sent";

const DECISION_TARGET_STATUS: Record<QuoteDecision, string> = {
  accept: "accepted",
  refuse: "refused",
};

export async function handleQuoteDecision(
  req: NextRequest,
  quoteIdParam: string,
  decision: QuoteDecision
): Promise<NextResponse> {
  const route = `/api/client/devis/[id]/${decision}`;

  const parsed = parseUuidParam(quoteIdParam);
  if (!parsed.ok || !parsed.value) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      route,
      detail: { field: "id", reason: "not-a-uuid" },
    });
    return denyJson(404);
  }

  const auth = await requireApiUser(route);
  if (!auth.ok) return auth.response;

  // Compté par compte et non par IP : une décision de devis est une action
  // authentifiée, le quota doit suivre l'identité.
  const limit = await enforceRateLimit(req, "quoteDecision", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const quote = await findQuoteForDecision(parsed.value);
  if (!quote) return denyJson(404);

  const denial = await authorizeResource(
    auth.user,
    decision,
    "quote",
    { ownerId: quote.ownerId },
    route
  );
  if (denial) return denial;

  const now = new Date();
  const targetStatus = DECISION_TARGET_STATUS[decision];

  // Transition déclarée ? La machine à états est la seule autorité : elle
  // refuse notamment de « dé-refuser » un devis, ou d'en accepter un déjà
  // tranché — ce qui est la garde contre la double facturation.
  if (!canTransitionQuote(quote.status, targetStatus)) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "medium",
      userId: auth.user.id,
      route,
      targetTable: "quotes",
      targetId: quote.id,
      detail: { control: "state-machine", from: quote.status, to: targetStatus },
    });
    return NextResponse.json(
      { success: false, error: "Ce devis n'est plus en attente de décision." },
      { status: 409 }
    );
  }

  // L'expiration est une donnée de temps, distincte de l'état : un devis peut
  // être encore `sent` en base tout en ayant dépassé sa validité.
  if (!isQuoteAcceptable(quote.status, quote.validUntil, now) && decision === "accept") {
    return NextResponse.json(
      { success: false, error: "La validité de ce devis a expiré." },
      { status: 409 }
    );
  }

  const ipAddress = getTrustedIp(req);
  const ipHash = ipAddress ? hashIpAddress(ipAddress) : null;

  // Mise à jour conditionnée au statut attendu : deux requêtes simultanées ne
  // peuvent pas trancher deux fois le même devis.
  const updated = await db
    .update(quotes)
    .set({
      status: targetStatus,
      updatedAt: now,
      ...(decision === "accept" ? { signedAt: now, signedIpHash: ipHash } : {}),
    })
    .where(and(eq(quotes.id, quote.id), eq(quotes.status, DECIDABLE_STATUS)))
    .returning({ id: quotes.id });

  if (updated.length === 0) {
    return NextResponse.json(
      { success: false, error: "Ce devis vient d'être traité." },
      { status: 409 }
    );
  }

  await logAuditEvent({
    userId: auth.user.id,
    action: decision === "accept" ? "QUOTE_ACCEPTED_ONLINE" : "QUOTE_REFUSED_ONLINE",
    targetTable: "quotes",
    // Identifiant interne vérifié, et non la valeur reçue dans l'URL.
    targetId: quote.id,
    diff: { status: targetStatus, decidedAt: now.toISOString() },
    ipAddress: ipAddress ?? undefined,
  });

  return NextResponse.json({
    success: true,
    message:
      decision === "accept"
        ? `Devis ${quote.number} accepté.`
        : `Devis ${quote.number} marqué comme refusé.`,
    status: targetStatus,
    decidedAt: now.toISOString(),
  });
}
