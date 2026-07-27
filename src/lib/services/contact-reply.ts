/**
 * Lien de réponse pré-rempli.
 *
 * L'application ne poste aucun courriel nominatif : elle prépare le message
 * dans le client de messagerie de l'opérateur. Cela évite d'avoir à traiter la
 * délivrabilité, l'archivage légal des échanges et la gestion des fils de
 * discussion — trois sujets hors périmètre V1.
 *
 * Chaque valeur interpolée passe par `encodeURIComponent`. Un nom contenant
 * `&subject=…` ou un retour à la ligne ne peut donc ni ajouter de paramètre à
 * l'URI, ni forger un en-tête dans le brouillon produit.
 */

export interface ReplyMailtoParams {
  email: string;
  reference: string;
  fullName: string;
}

/** Borne défensive : certains clients de messagerie tronquent au-delà. */
const MAX_MAILTO_LENGTH = 1800;

export function buildReplyMailto(params: ReplyMailtoParams): string {
  const subject = `Votre message ${params.reference} — Zlobodan Couverture`;
  const body = [
    `Bonjour ${params.fullName},`,
    "",
    `Nous faisons suite à votre message référencé ${params.reference}.`,
    "",
    "",
    "Bien à vous,",
    "L'équipe Zlobodan Couverture",
  ].join("\n");

  const query = new URLSearchParams({ subject, body }).toString();
  const mailto = `mailto:${encodeURIComponent(params.email)}?${query}`;

  return mailto.length > MAX_MAILTO_LENGTH
    ? `mailto:${encodeURIComponent(params.email)}?subject=${encodeURIComponent(subject)}`
    : mailto;
}
