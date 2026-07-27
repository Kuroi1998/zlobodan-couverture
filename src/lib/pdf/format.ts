/**
 * Formatage des valeurs affichées dans les documents.
 *
 * Regroupé ici pour que devis, récapitulatifs et documents à venir présentent
 * une date et une taille de la même façon. Un document où la date d'émission
 * s'écrit autrement que la date de validité donne l'impression d'un assemblage,
 * pas d'un document d'entreprise.
 *
 * Les dates sont rendues en UTC volontairement : le serveur peut vivre dans un
 * fuseau différent de celui du client, et un récapitulatif dont la date change
 * selon la machine qui l'imprime est indéfendable. Le décalage possible d'un
 * jour est explicité par l'heure sur les horodatages complets.
 */

const MONTHS = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
] as const;

/** Format court : 27/07/2026. */
export function formatDate(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "—";
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
}

/** Format long : 27 juillet 2026. */
export function formatLongDate(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "—";
  return `${value.getUTCDate()} ${MONTHS[value.getUTCMonth()]} ${value.getUTCFullYear()}`;
}

/** Horodatage complet : 27/07/2026 à 14:32 (UTC). */
export function formatDateTime(value: Date | null | undefined): string {
  if (!value || Number.isNaN(value.getTime())) return "—";
  const hours = String(value.getUTCHours()).padStart(2, "0");
  const minutes = String(value.getUTCMinutes()).padStart(2, "0");
  return `${formatDate(value)} à ${hours}:${minutes} (UTC)`;
}

/**
 * Taille de fichier lisible.
 *
 * Base 1024, unités abrégées. Au-delà du gigaoctet, la valeur n'a pas de sens
 * ici : les pièces jointes sont plafonnées à 10 Mo par la base.
 */
export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}
