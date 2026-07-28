import {
  CONTACT_MESSAGE_STATUSES,
  QUOTE_REQUEST_STATUSES,
  type ContactMessageStatus,
  type QuoteRequestStatus,
} from "./request-workflow";

/**
 * Libellés métier en français.
 *
 * Ils vivaient en trois copies — `admin/demandes/page.tsx`,
 * `admin/demandes/[id]/page.tsx` et `admin/contacts/…` — pendant que l'espace
 * client affichait la valeur brute de la colonne. Un client lisait donc
 * « estimate_in_preparation » là où l'opérateur lisait « Devis en
 * préparation ». Source unique, employée des deux côtés.
 *
 * Les enregistrements sont indexés par le type d'union : ajouter un statut
 * sans son libellé casse la compilation, ce qui est le bon sens d'échec.
 */

const QUOTE_REQUEST_LABELS: Record<QuoteRequestStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  under_review: "À étudier",
  contacted: "Contactée",
  visit_scheduled: "Visite planifiée",
  estimate_in_preparation: "Devis en préparation",
  estimate_sent: "Devis envoyé",
  accepted: "Acceptée",
  rejected: "Refusée",
  cancelled: "Annulée",
  archived: "Archivée",
};

const CONTACT_MESSAGE_LABELS: Record<ContactMessageStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  in_progress: "En cours",
  replied: "Répondu",
  closed: "Clôturé",
  archived: "Archivé",
  spam: "Indésirable",
};

/**
 * Formulation orientée client.
 *
 * Le vocabulaire interne décrit l'état d'un dossier pour celui qui le traite ;
 * le client, lui, veut savoir ce qui se passe pour lui. « À étudier » se dit
 * donc « En cours d'analyse », et les états purement internes sont regroupés.
 */
const QUOTE_REQUEST_CLIENT_LABELS: Record<QuoteRequestStatus, string> = {
  draft: "Brouillon",
  submitted: "Reçue",
  under_review: "En cours d'analyse",
  contacted: "Nous vous avons contacté",
  visit_scheduled: "Visite planifiée",
  estimate_in_preparation: "Devis en préparation",
  estimate_sent: "Devis envoyé",
  accepted: "Acceptée",
  rejected: "Refusée",
  cancelled: "Annulée",
  archived: "Archivée",
};

/** Prochaine action attendue, affichée au client. Jamais une invention : chaque état a une suite connue. */
const QUOTE_REQUEST_NEXT_STEP: Record<QuoteRequestStatus, string> = {
  draft: "Terminez votre demande pour nous l'envoyer.",
  submitted: "Nous analysons votre demande et revenons vers vous rapidement.",
  under_review: "Un couvreur étudie votre projet.",
  contacted: "Nous avons pris contact avec vous.",
  visit_scheduled: "Une visite technique est prévue.",
  estimate_in_preparation: "Nous préparons votre devis.",
  estimate_sent: "Votre devis vous a été transmis.",
  accepted: "Votre demande est acceptée, nous organisons la suite.",
  rejected: "Cette demande n'a pas abouti. Contactez-nous pour en discuter.",
  cancelled: "Cette demande a été annulée.",
  archived: "Ce dossier est clôturé.",
};

/** Palette d'état, volontairement réduite : neutre, en cours, favorable, défavorable. */
export type StatusTone = "neutral" | "progress" | "positive" | "negative";

const QUOTE_REQUEST_TONES: Record<QuoteRequestStatus, StatusTone> = {
  draft: "neutral",
  submitted: "progress",
  under_review: "progress",
  contacted: "progress",
  visit_scheduled: "progress",
  estimate_in_preparation: "progress",
  estimate_sent: "progress",
  accepted: "positive",
  rejected: "negative",
  cancelled: "negative",
  archived: "neutral",
};

const CONTACT_MESSAGE_TONES: Record<ContactMessageStatus, StatusTone> = {
  new: "progress",
  read: "progress",
  in_progress: "progress",
  replied: "positive",
  closed: "neutral",
  archived: "neutral",
  spam: "negative",
};

export function quoteRequestLabel(status: QuoteRequestStatus): string {
  return QUOTE_REQUEST_LABELS[status];
}

export function quoteRequestClientLabel(status: QuoteRequestStatus): string {
  return QUOTE_REQUEST_CLIENT_LABELS[status];
}

export function quoteRequestNextStep(status: QuoteRequestStatus): string {
  return QUOTE_REQUEST_NEXT_STEP[status];
}

export function quoteRequestTone(status: QuoteRequestStatus): StatusTone {
  return QUOTE_REQUEST_TONES[status];
}

export function contactMessageLabel(status: ContactMessageStatus): string {
  return CONTACT_MESSAGE_LABELS[status];
}

export function contactMessageTone(status: ContactMessageStatus): StatusTone {
  return CONTACT_MESSAGE_TONES[status];
}

/** Options de filtre du back-office, dans l'ordre du cycle de vie. */
export function quoteRequestFilterOptions(): ReadonlyArray<{
  value: QuoteRequestStatus;
  label: string;
}> {
  return QUOTE_REQUEST_STATUSES.map((value) => ({
    value,
    label: QUOTE_REQUEST_LABELS[value],
  }));
}

export function contactMessageFilterOptions(): ReadonlyArray<{
  value: ContactMessageStatus;
  label: string;
}> {
  return CONTACT_MESSAGE_STATUSES.map((value) => ({
    value,
    label: CONTACT_MESSAGE_LABELS[value],
  }));
}

// ---------------------------------------------------------------------------
// Libellés des données déclarées dans le formulaire de demande
// ---------------------------------------------------------------------------
//
// Ces valeurs sont contraintes en base par des `CHECK`. Les enregistrements
// ci-dessous couvrent exactement ces domaines ; une valeur inattendue retombe
// sur la chaîne brute plutôt que sur une chaîne vide, pour qu'une anomalie
// reste visible au lieu d'être masquée.

const INTERVENTION_LABELS: Record<string, string> = {
  refection: "Réfection de toiture",
  fuite: "Recherche de fuite",
  demoussage: "Démoussage",
  gouttieres: "Gouttières",
  isolation: "Isolation",
  velux: "Fenêtre de toit",
  autre: "Autre intervention",
};

const ROOF_LABELS: Record<string, string> = {
  ardoise: "Ardoise",
  tuile_terre_cuite: "Tuile en terre cuite",
  tuile_beton: "Tuile en béton",
  zinc: "Zinc",
  bac_acier: "Bac acier",
  je_ne_sais_pas: "Non déterminé",
};

const SURFACE_LABELS: Record<string, string> = {
  less_50: "Moins de 50 m²",
  "50-100": "50 à 100 m²",
  "100-150": "100 à 150 m²",
  more_150: "Plus de 150 m²",
  unknown: "Surface non déterminée",
};

const CONTACT_SUBJECT_LABELS: Record<string, string> = {
  general: "Question générale",
  emergency: "Urgence",
  follow_up: "Suivi de dossier",
  complaint: "Réclamation",
  other: "Autre sujet",
};

export function interventionLabel(value: string): string {
  return INTERVENTION_LABELS[value] ?? value;
}

export function roofLabel(value: string): string {
  return ROOF_LABELS[value] ?? value;
}

export function surfaceLabel(value: string): string {
  return SURFACE_LABELS[value] ?? value;
}

export function contactSubjectLabel(value: string): string {
  return CONTACT_SUBJECT_LABELS[value] ?? value;
}
