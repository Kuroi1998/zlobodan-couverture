import { escapeEmailField, escapeHtml } from "@/lib/security/encoding";
import { recordSecurityEvent } from "@/lib/security/security-events";

/**
 * Notifications de sécurité au titulaire du compte.
 *
 * ATTENTION — LIMITE CONNUE ET ASSUMÉE : aucun client SMTP n'est installé dans
 * ce projet. Les messages sont construits, échappés et journalisés, mais ils
 * ne partent pas. Tant qu'un transport n'est pas branché (`registerTransport`),
 * les alertes « nouvel appareil », « compte verrouillé » et « réutilisation de
 * jeton » n'atteignent pas l'utilisateur.
 *
 * Ce point figure explicitement dans les risques résiduels de SECURITY.md. Il
 * est structuré ainsi plutôt que laissé en TODO pour que le branchement d'un
 * transport soit une ligne de configuration, et non une réécriture.
 */

export type SecurityNotificationKind =
  | "new-device-login"
  | "account-locked"
  | "session-token-reuse"
  | "password-changed";

export interface SecurityNotification {
  kind: SecurityNotificationKind;
  to: string;
  /** Valeurs affichées dans le message. Toutes échappées avant rendu. */
  context: Record<string, string>;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export type EmailTransport = (message: EmailMessage) => Promise<void>;

let transport: EmailTransport | null = null;

/** Branche un transport réel (SMTP, Resend, …). Voir le runbook. */
export function registerTransport(next: EmailTransport | null): void {
  transport = next;
}

const SUBJECTS: Record<SecurityNotificationKind, string> = {
  "new-device-login": "Nouvelle connexion à votre espace client Zlobodan",
  "account-locked": "Tentatives de connexion répétées sur votre compte Zlobodan",
  "session-token-reuse": "Alerte de sécurité : vos sessions ont été fermées",
  "password-changed": "Votre mot de passe Zlobodan a été modifié",
};

const BODIES: Record<SecurityNotificationKind, string> = {
  "new-device-login":
    "Une connexion à votre espace client vient d'avoir lieu depuis un appareil que nous ne connaissions pas.",
  "account-locked":
    "Plusieurs tentatives de connexion infructueuses ont été enregistrées sur votre compte. L'accès est temporairement restreint.",
  "session-token-reuse":
    "Un identifiant de session déjà expiré a été présenté. Par précaution, toutes vos sessions ont été fermées. Reconnectez-vous et changez votre mot de passe.",
  "password-changed": "Le mot de passe de votre compte vient d'être modifié.",
};

/**
 * Rendu du message.
 *
 * Chaque valeur de contexte passe par `escapeEmailField` : un nom contenant du
 * HTML ne peut ni casser le rendu, ni injecter de lien, ni — via les retours à
 * la ligne — forger un en-tête de message.
 */
export function buildSecurityEmail(notification: SecurityNotification): EmailMessage {
  const rows = Object.entries(notification.context)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#64748b;">${escapeHtml(label)}</td>` +
        `<td style="padding:4px 0;color:#0f172a;">${escapeEmailField(value)}</td></tr>`
    )
    .join("");

  const body = BODIES[notification.kind];

  return {
    to: notification.to,
    subject: escapeEmailField(SUBJECTS[notification.kind]),
    html:
      `<div style="font-family:Arial,sans-serif;font-size:14px;color:#0f172a;">` +
      `<p>${escapeHtml(body)}</p>` +
      `<table style="font-size:13px;border-collapse:collapse;">${rows}</table>` +
      `<p style="color:#64748b;font-size:12px;">Si vous êtes à l'origine de cette action, ` +
      `aucune démarche n'est nécessaire. Dans le cas contraire, contactez-nous immédiatement.</p>` +
      `</div>`,
    text: `${body}\n\n${Object.entries(notification.context)
      .map(([label, value]) => `${label}: ${escapeEmailField(value)}`)
      .join("\n")}`,
  };
}

export async function sendSecurityNotification(
  notification: SecurityNotification
): Promise<"sent" | "no-transport" | "failed"> {
  const message = buildSecurityEmail(notification);

  if (!transport) {
    // Journalisé en `high` : une alerte de sécurité non délivrée est un trou
    // de couverture, pas un détail d'exploitation.
    await recordSecurityEvent({
      kind: "AUDIT_WRITE_FAILURE",
      severity: "high",
      detail: {
        reason: "no-email-transport",
        notification: notification.kind,
        subject: message.subject,
      },
    });
    return "no-transport";
  }

  try {
    await transport(message);
    return "sent";
  } catch (error) {
    await recordSecurityEvent({
      kind: "AUDIT_WRITE_FAILURE",
      severity: "high",
      detail: {
        reason: "email-transport-error",
        notification: notification.kind,
        message: error instanceof Error ? error.message : "unknown",
      },
    });
    return "failed";
  }
}
