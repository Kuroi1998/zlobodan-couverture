/**
 * Identité de l'entreprise — source de vérité unique.
 *
 * Tout ce qui identifie légalement ou contractuellement Zlobodan est déclaré
 * ici, et nulle part ailleurs. Le site, les données structurées, les PDF et les
 * e-mails lisent ce module : corriger une coordonnée à un seul endroit suffit.
 *
 * -------------------------------------------------------------------------
 * POURQUOI TANT DE `null`
 * -------------------------------------------------------------------------
 * L'audit éditorial de 2026-07-27 a établi que ce site dérivait d'un modèle
 * conçu pour une entreprise **française** de la région nantaise, re-libellé en
 * belge sans que les données d'identité soient remplacées. Y figuraient
 * notamment un numéro BCE précis, un capital social, un numéro de police
 * d'assurance et deux compagnies d'assurance citées ensemble.
 *
 * Aucune de ces valeurs n'a de preuve. Un numéro d'entreprise inexact n'est pas
 * une imprécision : il désigne potentiellement **une autre société réelle**, et
 * l'afficher engage la responsabilité de l'éditeur bien plus sûrement qu'une
 * mention légale visiblement incomplète.
 *
 * Ces champs valent donc `null` jusqu'à production d'une preuve. Le typage
 * l'impose : `string | null` oblige chaque appelant à traiter l'absence, là où
 * une chaîne vide se serait affichée sans bruit.
 *
 * Renseigner un champ, c'est affirmer détenir la preuve correspondante. La
 * procédure et le suivi vivent dans `docs/content-verification-register.md`.
 */

export interface PostalAddress {
  readonly street: string;
  readonly postalCode: string;
  readonly locality: string;
  readonly country: string;
}

export type CompanyIdentity = Readonly<{
  /** Nom commercial. Employé partout dans l'interface. */
  tradeName: string;
  /**
   * Dénomination légale exacte, forme juridique comprise.
   *
   * Distincte du nom commercial : c'est elle qui doit figurer dans les mentions
   * légales, et elle seule.
   */
  legalName: string | null;
  /** Forme juridique belge : SRL, SA, SComm, indépendant… */
  legalForm: string | null;
  /** Numéro d'entreprise BCE, format `BE 0XXX.XXX.XXX`. */
  companyNumber: string | null;
  /** Numéro de TVA. En Belgique, identique au numéro BCE dans la quasi-totalité des cas. */
  vatNumber: string | null;
  registeredAddress: PostalAddress | null;
  publicPhone: string | null;
  /** Version affichable du téléphone. Nulle si `publicPhone` l'est. */
  publicPhoneLabel: string | null;
  publicEmail: string | null;
  /** Personne physique responsable de la publication, nommément. */
  publicationDirector: string | null;
  websiteUrl: string;
}>;

/**
 * Couverture d'assurance.
 *
 * Séparée de l'identité parce qu'elle relève d'un contrat, dont les conditions
 * exactes — territoire, activités couvertes, période — doivent être lues avant
 * toute publication. Nommer un assureur revient de surcroît à employer sa
 * marque, ce qui suppose d'en avoir le droit.
 */
export type InsuranceCoverage = Readonly<{
  insurerName: string | null;
  policyNumber: string | null;
  coverageLabel: string | null;
}>;

export const companyIdentity: CompanyIdentity = {
  tradeName: "Zlobodan Couverture-Zinguerie",

  // --- À confirmer : aucune preuve disponible au 2026-07-27 ---------------
  legalName: null,
  legalForm: null,
  companyNumber: null,
  vatNumber: null,
  registeredAddress: null,
  publicPhone: null,
  publicPhoneLabel: null,
  publicEmail: null,
  publicationDirector: null,

  // Le domaine est celui sur lequel le site est publié : vérifiable par
  // construction, contrairement au reste.
  websiteUrl: "https://zlobodan-couverture.be",
};

export const insuranceCoverage: InsuranceCoverage = {
  // L'ancienne configuration citait « AXA Belgium / Ethias » — deux compagnies
  // pour un seul contrat, ce qui n'a pas de sens — et un numéro de police
  // inventé. Rien n'est publié tant que le contrat n'a pas été lu.
  insurerName: null,
  policyNumber: null,
  coverageLabel: null,
};

/**
 * L'entreprise dispose-t-elle d'une identité légale publiable ?
 *
 * Sert aux pages légales à choisir entre l'affichage des informations et une
 * mention honnête de leur collecte en cours. Le nom commercial et l'URL ne
 * suffisent pas : ce sont les identifiants légaux qui comptent.
 */
export function hasPublishableLegalIdentity(
  identity: CompanyIdentity = companyIdentity
): boolean {
  return (
    identity.legalName !== null &&
    identity.companyNumber !== null &&
    identity.registeredAddress !== null
  );
}

/** Coordonnées de contact réellement publiables, dans l'ordre d'affichage. */
export function publishableContactPoints(
  identity: CompanyIdentity = companyIdentity
): ReadonlyArray<{ label: string; value: string; href: string | null }> {
  const points: Array<{ label: string; value: string; href: string | null }> = [];

  if (identity.publicPhone && identity.publicPhoneLabel) {
    points.push({
      label: "Téléphone",
      value: identity.publicPhoneLabel,
      href: `tel:${identity.publicPhone}`,
    });
  }

  if (identity.publicEmail) {
    points.push({
      label: "Courriel",
      value: identity.publicEmail,
      href: `mailto:${identity.publicEmail}`,
    });
  }

  if (identity.registeredAddress) {
    const address = identity.registeredAddress;
    points.push({
      label: "Adresse",
      value: `${address.street}, ${address.postalCode} ${address.locality}, ${address.country}`,
      href: null,
    });
  }

  return points;
}

/** Adresse postale sur une ligne, ou `null` si elle n'est pas renseignée. */
export function formatRegisteredAddress(
  identity: CompanyIdentity = companyIdentity
): string | null {
  const address = identity.registeredAddress;
  if (!address) return null;
  return `${address.street}, ${address.postalCode} ${address.locality}, ${address.country}`;
}
