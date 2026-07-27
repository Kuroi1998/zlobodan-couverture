import "server-only";
import { db } from "@/db/client";
import { notificationOutbox } from "@/db/schema/notifications";
import { getAppOrigin } from "@/config/env";
import { escapeEmailField, escapeHtml } from "@/lib/security/encoding";
import { companyIdentity } from "@/config/company";
import { decryptSecret, encryptSecret } from "@/lib/security/secret-box";

export type AuthEmailKind =
  | "auth.welcome"
  | "auth.verify_email"
  | "auth.password_reset"
  | "auth.password_reset_completed"
  | "auth.password_changed"
  | "auth.email_change_requested"
  | "auth.email_changed"
  | "auth.two_factor_enabled"
  | "auth.two_factor_disabled"
  | "auth.recovery_code_used"
  | "auth.sessions_revoked"
  | "auth.new_device_login"
  | "auth.account_locked"
  | "auth.account_disabled"
  | "auth.account_enabled";

interface AuthEmailInput {
  kind: AuthEmailKind;
  userId: string;
  recipient: string;
  payload?: Record<string, string>;
  sensitive?: Record<string, string>;
}

type NotificationInsert = typeof notificationOutbox.$inferInsert;

function encryptionContext(kind: string, entityId: string): string {
  return `notification-outbox:${kind}:${entityId}`;
}

export function createAuthEmailOutboxEntry(input: AuthEmailInput): NotificationInsert {
  return {
    eventType: input.kind,
    entityType: "user",
    entityId: input.userId,
    recipient: input.recipient,
    payload: input.payload ?? {},
    encryptedPayload: input.sensitive
      ? encryptSecret(
          JSON.stringify(input.sensitive),
          encryptionContext(input.kind, input.userId)
        )
      : null,
  };
}

export async function queueAuthEmail(input: AuthEmailInput): Promise<void> {
  await db.insert(notificationOutbox).values(createAuthEmailOutboxEntry(input));
}

function readSensitivePayload(
  kind: string,
  entityId: string,
  encryptedPayload: string | null
): Record<string, string> {
  if (!encryptedPayload) return {};
  const parsed: unknown = JSON.parse(
    decryptSecret(encryptedPayload, encryptionContext(kind, entityId))
  );
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Charge utile d'e-mail invalide.");
  }
  const values: Record<string, string> = {};
  for (const [key, value] of Object.entries(parsed)) {
    if (typeof value !== "string") {
      throw new Error("Charge utile d'e-mail invalide.");
    }
    values[key] = value;
  }
  return values;
}

function absoluteLink(path: string | undefined): string | null {
  if (!path || !path.startsWith("/") || path.startsWith("//")) return null;
  return new URL(path, `${getAppOrigin()}/`).toString();
}

interface AuthEmailCopy {
  subject: string;
  heading: string;
  body: string;
  action?: string;
  actionLabel?: string;
  warning?: string;
}

function emailCopy(
  kind: AuthEmailKind,
  payload: Record<string, string>,
  sensitive: Record<string, string>
): AuthEmailCopy {
  const link = absoluteLink(sensitive.path);
  switch (kind) {
    case "auth.welcome":
      return {
        subject: "Bienvenue chez Zlobodan Couverture",
        heading: "Votre compte est prêt",
        body: "Merci d'avoir créé votre espace client. Vous pouvez désormais suivre vos demandes et documents.",
      };
    case "auth.verify_email":
      return {
        subject: "Vérifiez votre adresse e-mail",
        heading: "Confirmez votre adresse e-mail",
        body: "Utilisez le bouton ci-dessous pour confirmer votre adresse. Ce lien expire dans 24 heures.",
        action: link ?? undefined,
        actionLabel: "Vérifier mon adresse",
        warning: "Si vous n'avez pas créé ce compte, ignorez ce message.",
      };
    case "auth.password_reset":
      return {
        subject: "Réinitialisation de votre mot de passe",
        heading: "Choisissez un nouveau mot de passe",
        body: "Une demande de réinitialisation a été reçue. Le lien est utilisable une seule fois et expire dans 15 minutes.",
        action: link ?? undefined,
        actionLabel: "Réinitialiser mon mot de passe",
        warning: "Si vous n'êtes pas à l'origine de cette demande, ne cliquez pas sur le lien.",
      };
    case "auth.password_reset_completed":
      return {
        subject: "Votre mot de passe a été réinitialisé",
        heading: "Mot de passe réinitialisé",
        body: "Votre mot de passe a été remplacé et toutes les sessions ont été fermées.",
        warning: "Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
      };
    case "auth.password_changed":
      return {
        subject: "Votre mot de passe a été modifié",
        heading: "Mot de passe modifié",
        body: "Votre mot de passe vient d'être modifié. Les autres appareils ont été déconnectés.",
        warning: "Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
      };
    case "auth.email_change_requested":
      return {
        subject: "Confirmez votre nouvelle adresse e-mail",
        heading: "Confirmez le changement d'adresse",
        body: "Le changement ne sera appliqué qu'après confirmation. Ce lien expire dans 30 minutes.",
        action: link ?? undefined,
        actionLabel: "Confirmer la nouvelle adresse",
        warning: "Si vous n'avez pas demandé ce changement, ignorez ce message.",
      };
    case "auth.email_changed":
      return {
        subject: "Votre adresse e-mail a été modifiée",
        heading: "Adresse e-mail modifiée",
        body: `L'adresse de connexion du compte est désormais ${payload.newEmail ?? "mise à jour"}.`,
        warning: "Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
      };
    case "auth.two_factor_enabled":
      return {
        subject: "Authentification à deux facteurs activée",
        heading: "La 2FA est active",
        body: "Une application d'authentification est maintenant requise pour vos prochaines connexions.",
      };
    case "auth.two_factor_disabled":
      return {
        subject: "Authentification à deux facteurs désactivée",
        heading: "La 2FA a été désactivée",
        body: "Les anciens codes de récupération ont été invalidés.",
        warning: "Si vous n'êtes pas à l'origine de cette action, contactez-nous immédiatement.",
      };
    case "auth.recovery_code_used":
      return {
        subject: "Un code de récupération a été utilisé",
        heading: "Connexion de secours détectée",
        body: `Il reste ${payload.remaining ?? "moins de"} codes de récupération disponibles.`,
        warning: "Si vous n'êtes pas à l'origine de cette connexion, changez votre mot de passe.",
      };
    case "auth.sessions_revoked":
      return {
        subject: "Vos sessions ont été fermées",
        heading: "Déconnexion globale effectuée",
        body: "Les sessions concernées ne peuvent plus accéder à votre compte.",
      };
    case "auth.new_device_login":
      return {
        subject: "Nouvelle connexion à votre compte",
        heading: "Nouvel appareil détecté",
        body: `Une connexion a eu lieu avec ${payload.device ?? "un appareil inconnu"}.`,
        warning: "Si ce n'était pas vous, changez votre mot de passe et fermez toutes les sessions.",
      };
    case "auth.account_locked":
      return {
        subject: "Tentatives de connexion répétées",
        heading: "Accès temporairement limité",
        body: "Plusieurs tentatives infructueuses ont été détectées. La limitation est temporaire.",
      };
    case "auth.account_disabled":
      return {
        subject: "Votre compte a été désactivé",
        heading: "Compte désactivé",
        body: "Votre compte ne peut plus ouvrir de session. Contactez le support si vous pensez qu'il s'agit d'une erreur.",
      };
    case "auth.account_enabled":
      return {
        subject: "Votre compte a été réactivé",
        heading: "Compte réactivé",
        body: "Vous pouvez de nouveau vous connecter à votre espace.",
      };
  }
}

export function buildAuthEmail(input: {
  kind: string;
  entityId: string;
  recipient: string;
  payload: Record<string, string>;
  encryptedPayload: string | null;
}): { subject: string; text: string; html: string } {
  if (!input.kind.startsWith("auth.")) {
    throw new Error("Type d'e-mail d'authentification inconnu.");
  }
  const sensitive = readSensitivePayload(
    input.kind,
    input.entityId,
    input.encryptedPayload
  );
  const copy = emailCopy(input.kind as AuthEmailKind, input.payload, sensitive);
  const safeHeading = escapeHtml(copy.heading);
  const safeBody = escapeHtml(copy.body);
  const actionHtml = copy.action
    ? `<p><a href="${escapeHtml(copy.action)}" style="display:inline-block;background:#c65d35;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none">${escapeHtml(copy.actionLabel ?? "Continuer")}</a></p>`
    : "";
  const warningHtml = copy.warning
    ? `<p style="color:#991b1b">${escapeHtml(copy.warning)}</p>`
    : "";
  const actionText = copy.action
    ? `\n\n${copy.actionLabel ?? "Continuer"} : ${escapeEmailField(copy.action)}`
    : "";
  const warningText = copy.warning ? `\n\n${copy.warning}` : "";

/**
 * Signature des courriels transactionnels.
 *
 * Elle affirmait « Zlobodan Couverture SRL » et donnait une adresse
 * `support@` : la forme juridique n'est pas vérifiée, et la boîte
 * correspondante n'existe peut-être pas — un destinataire qui y répond
 * n'obtient alors aucune réponse. La signature ne mentionne donc une adresse
 * que si elle est déclarée vérifiée, et renvoie sinon vers le site.
 */
function emailSignatureText(): string {
  return companyIdentity.publicEmail
    ? `${companyIdentity.tradeName} — ${companyIdentity.publicEmail}`
    : `${companyIdentity.tradeName} — ${companyIdentity.websiteUrl}/contact`;
}

  return {
    subject: escapeEmailField(copy.subject),
    text:
      `${copy.heading}\n\n${copy.body}${actionText}${warningText}\n\n` +
      "Zlobodan Couverture SRL — support@zlobodan-couverture.be",
    html:
      '<div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#0f172a">' +
      `<h1 style="font-size:22px">${safeHeading}</h1><p>${safeBody}</p>` +
      `${actionHtml}${warningHtml}` +
      `<p style="color:#64748b;font-size:12px">${escapeHtml(emailSignatureText())}</p></div>`,
  };
}
