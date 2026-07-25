/**
 * Machines à états des documents commerciaux.
 *
 * Sans transitions déclarées, chaque endroit du code décide seul de ce qui est
 * permis — et il suffit d'un chemin oublié pour qu'une facture payée
 * redevienne annulable, ou qu'un devis accepté soit modifié après signature.
 *
 * Principe : **liste blanche**. Une transition absente de la table est
 * refusée. Ajouter un état sans déclarer ses transitions le rend inerte, ce
 * qui est le bon sens d'échec.
 */

export class TransitionError extends Error {
  readonly from: string;
  readonly to: string;
  constructor(entity: string, from: string, to: string) {
    super(`Transition ${entity} interdite : ${from} → ${to}.`);
    this.name = "TransitionError";
    this.from = from;
    this.to = to;
  }
}

// ---------------------------------------------------------------------------
// Devis
// ---------------------------------------------------------------------------

export const QUOTE_STATES = ["draft", "sent", "accepted", "refused", "expired"] as const;
export type QuoteState = (typeof QUOTE_STATES)[number];

/**
 * `accepted` et `refused` sont **terminaux**.
 *
 * C'est ce qui empêche de « dé-refuser » un devis pour le réaccepter à un
 * autre montant, et c'est aussi ce qui rend impossible la génération de deux
 * factures depuis un même devis : un devis déjà `accepted` ne peut plus
 * repasser par la transition qui déclenche la facturation.
 */
const QUOTE_TRANSITIONS: Record<QuoteState, readonly QuoteState[]> = {
  draft: ["sent", "expired"],
  sent: ["accepted", "refused", "expired"],
  accepted: [],
  refused: [],
  expired: [],
};

// ---------------------------------------------------------------------------
// Factures
// ---------------------------------------------------------------------------

export const INVOICE_STATES = ["issued", "paid", "overdue", "cancelled"] as const;
export type InvoiceState = (typeof INVOICE_STATES)[number];

/**
 * `paid` est terminal : une facture réglée ne s'annule pas, elle se corrige
 * par une note de crédit. C'est une obligation comptable autant qu'une
 * protection — annuler une facture payée efface la trace d'un encaissement.
 */
const INVOICE_TRANSITIONS: Record<InvoiceState, readonly InvoiceState[]> = {
  issued: ["paid", "overdue", "cancelled"],
  overdue: ["paid", "cancelled"],
  paid: [],
  cancelled: [],
};

function isKnownState<T extends string>(states: readonly T[], value: string): value is T {
  return (states as readonly string[]).includes(value);
}

function assertTransition<T extends string>(
  entity: string,
  table: Record<T, readonly T[]>,
  states: readonly T[],
  from: string,
  to: string
): T {
  if (!isKnownState(states, from) || !isKnownState(states, to)) {
    throw new TransitionError(entity, from, to);
  }
  if (!table[from].includes(to)) {
    throw new TransitionError(entity, from, to);
  }
  return to;
}

export function canTransitionQuote(from: string, to: string): boolean {
  if (!isKnownState(QUOTE_STATES, from) || !isKnownState(QUOTE_STATES, to)) return false;
  return QUOTE_TRANSITIONS[from].includes(to);
}

export function assertQuoteTransition(from: string, to: string): QuoteState {
  return assertTransition("devis", QUOTE_TRANSITIONS, QUOTE_STATES, from, to);
}

export function canTransitionInvoice(from: string, to: string): boolean {
  if (!isKnownState(INVOICE_STATES, from) || !isKnownState(INVOICE_STATES, to)) return false;
  return INVOICE_TRANSITIONS[from].includes(to);
}

export function assertInvoiceTransition(from: string, to: string): InvoiceState {
  return assertTransition("facture", INVOICE_TRANSITIONS, INVOICE_STATES, from, to);
}

/** Un devis figé ne doit plus voir ses lignes ni ses montants modifiés. */
export function isQuoteMutable(state: string): boolean {
  return state === "draft";
}

/**
 * Un devis expiré ne peut plus être accepté, même si son statut en base est
 * encore `sent` : l'expiration est une donnée de temps, pas seulement d'état.
 * Les deux conditions doivent être vérifiées ensemble.
 */
export function isQuoteAcceptable(state: string, validUntil: Date, now = new Date()): boolean {
  return canTransitionQuote(state, "accepted") && validUntil.getTime() >= now.getTime();
}

export const TRANSITION_TABLES = { QUOTE_TRANSITIONS, INVOICE_TRANSITIONS };
