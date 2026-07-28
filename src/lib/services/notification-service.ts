import { escapeEmailField, escapeHtml } from "@/lib/security/encoding";
/**
 * Ancien rendu conservé pour les notifications non liées à un jeton.
 * L'envoi réel passe exclusivement par `notification_outbox` et son
 * dispatcher SMTP ; aucun transport en mémoire ou mode simulé n'existe.
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
