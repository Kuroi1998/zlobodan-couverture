import "server-only";
import nodemailer from "nodemailer";
import { and, asc, eq, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { notificationOutbox } from "@/db/schema/notifications";
import { getSmtpConfig } from "@/config/env";
import { escapeEmailField, escapeHtml } from "@/lib/security/encoding";
import { recordSecurityEvent } from "@/lib/security/security-events";
import {
  isQuoteRequestStatus,
  type QuoteRequestStatus,
} from "@/domain/request-workflow";
import {
  quoteRequestClientLabel,
  quoteRequestNextStep,
} from "@/domain/request-labels";
import { buildAuthEmail } from "./auth-email-service";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 25;
const SMTP_ERROR_CODES = new Set([
  "EAUTH",
  "ECONNECTION",
  "EDNS",
  "EENVELOPE",
  "EMESSAGE",
  "ESOCKET",
  "ETIMEDOUT",
]);

function deliveryFailureCode(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = String(error.code).toUpperCase();
    if (SMTP_ERROR_CODES.has(code)) return code;
  }
  return "DELIVERY_FAILED";
}

function buildEmail(
  eventType: string,
  reference: string,
  status: QuoteRequestStatus | string | undefined
) {
  const safeReference = escapeEmailField(reference);

  if (eventType.endsWith(".admin")) {
    return {
      subject: `Nouvelle demande ${safeReference}`,
      text: `Une nouvelle demande ${safeReference} a été enregistrée. Consultez l'administration sécurisée.`,
      html: `<p>Une nouvelle demande <strong>${escapeHtml(safeReference)}</strong> a été enregistrée.</p><p>Consultez l'administration sécurisée.</p>`,
    };
  }

  if (eventType === "quote_request.status_changed") {
    // Le libellé provient de la table de correspondance, jamais de la charge
    // utile. `status` est un texte lu en base : le garde de type le ramène
    // dans le domaine connu, et une valeur inattendue retombe sur une
    // formulation neutre plutôt que d'être recopiée dans le courriel.
    const raw = status ?? "";
    const known = isQuoteRequestStatus(raw) ? raw : undefined;
    const safeLabel = escapeEmailField(
      known ? quoteRequestClientLabel(known) : "mise à jour"
    );
    const safeStep = escapeEmailField(
      known ? quoteRequestNextStep(known) : "Consultez votre espace client pour le détail."
    );
    return {
      subject: `Votre demande ${safeReference} : ${safeLabel}`,
      text: `Votre demande ${safeReference} a changé d'état : ${safeLabel}.\n\n${safeStep}`,
      html:
        `<p>Votre demande <strong>${escapeHtml(safeReference)}</strong> a changé d'état : ` +
        `<strong>${escapeHtml(safeLabel)}</strong>.</p><p>${escapeHtml(safeStep)}</p>`,
    };
  }

  return {
    subject: `Accusé de réception ${safeReference}`,
    text: `Votre demande a bien été enregistrée sous la référence ${safeReference}. Notre équipe vous recontactera.`,
    html: `<p>Votre demande a bien été enregistrée sous la référence <strong>${escapeHtml(safeReference)}</strong>.</p><p>Notre équipe vous recontactera.</p>`,
  };
}

export async function dispatchNotificationOutbox(): Promise<{
  sent: number;
  failed: number;
  skipped: number;
}> {
  const smtp = getSmtpConfig();
  if (!smtp) return { sent: 0, failed: 0, skipped: 1 };

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    // Mailpit en CI écoute volontairement en SMTP local sans TLS. Un runtime
    // de production exige STARTTLS (ou TLS implicite sur 465).
    requireTLS: process.env.NODE_ENV === "production" && !smtp.secure,
    tls: { rejectUnauthorized: true },
    auth: { user: smtp.user, pass: smtp.password },
  });
  const now = new Date();
  await db
    .update(notificationOutbox)
    .set({ status: "pending" })
    .where(
      and(
        eq(notificationOutbox.status, "processing"),
        lte(notificationOutbox.nextAttemptAt, now)
      )
    );
  const pending = await db
    .select()
    .from(notificationOutbox)
    .where(
      and(
        eq(notificationOutbox.status, "pending"),
        lte(notificationOutbox.nextAttemptAt, now)
      )
    )
    .orderBy(asc(notificationOutbox.createdAt))
    .limit(BATCH_SIZE);

  let sent = 0;
  let failed = 0;
  for (const item of pending) {
    const claimed = await db
      .update(notificationOutbox)
      .set({
        status: "processing",
        nextAttemptAt: new Date(Date.now() + 15 * 60_000),
      })
      .where(
        and(
          eq(notificationOutbox.id, item.id),
          eq(notificationOutbox.status, "pending")
        )
      )
      .returning({ id: notificationOutbox.id });
    if (claimed.length === 0) continue;

    try {
      const reference = item.payload.reference ?? "dossier";
      const message = item.eventType.startsWith("auth.")
        ? buildAuthEmail({
            kind: item.eventType,
            entityId: item.entityId,
            recipient: item.recipient,
            payload: item.payload,
            encryptedPayload: item.encryptedPayload,
          })
        : buildEmail(item.eventType, reference, item.payload.status);
      await transport.sendMail({ from: smtp.from, to: item.recipient, ...message });
      await db
        .update(notificationOutbox)
        .set({
          status: "sent",
          attemptCount: item.attemptCount + 1,
          sentAt: new Date(),
          lastError: null,
        })
        .where(eq(notificationOutbox.id, item.id));
      sent += 1;
    } catch (error) {
      const attempts = item.attemptCount + 1;
      const terminal = attempts >= MAX_ATTEMPTS;
      const nextAttemptAt = new Date(Date.now() + Math.min(60, 2 ** attempts) * 60_000);
      await db
        .update(notificationOutbox)
        .set({
          status: terminal ? "failed" : "pending",
          attemptCount: attempts,
          nextAttemptAt,
          // Conserve une catégorie exploitable sans recopier la réponse SMTP,
          // qui peut contenir une adresse ou un détail d'infrastructure.
          lastError: deliveryFailureCode(error),
        })
        .where(eq(notificationOutbox.id, item.id));
      await recordSecurityEvent({
        kind: "NOTIFICATION_FAILED",
        severity: terminal ? "high" : "medium",
        targetTable: "notification_outbox",
        targetId: item.id,
        detail: { eventType: item.eventType, attempts, terminal },
      });
      failed += 1;
    }
  }

  return { sent, failed, skipped: 0 };
}
