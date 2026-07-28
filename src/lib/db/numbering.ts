import { selectNextSequenceValue } from "./raw-queries";

/**
 * Numérotation séquentielle des documents comptables.
 *
 * La version précédente dérivait le numéro suivant d'un `lastNumber` lu par
 * l'appelant, hors transaction. Deux facturations simultanées lisaient donc la
 * même valeur et produisaient **deux fois FACT-2026-0043**. En comptabilité
 * belge, la séquence de facturation doit être continue et sans doublon : c'est
 * un problème de conformité autant que de données.
 *
 * La correction s'appuie sur une **séquence PostgreSQL**, seul mécanisme dont
 * l'incrément est atomique sans verrou explicite et sans risque d'interblocage.
 * `nextval()` ne rejoue jamais la même valeur, même sous forte concurrence,
 * même si la transaction appelante est annulée par la suite.
 *
 * Contrepartie assumée : une transaction annulée « consomme » son numéro, ce
 * qui crée un trou dans la séquence. Un trou est acceptable et explicable ; un
 * doublon ne l'est pas.
 */

export type DocumentKind = "invoice" | "quote" | "credit_note";

const PREFIXES: Record<DocumentKind, string> = {
  invoice: "FACT",
  quote: "DEV",
  credit_note: "AV",
};

/**
 * Noms de séquences construits depuis une table constante, jamais depuis une
 * valeur reçue : un identifiant SQL ne peut pas être passé en paramètre lié.
 */
const SEQUENCE_NAMES: Record<DocumentKind, string> = {
  invoice: "seq_invoice_number",
  quote: "seq_quote_number",
  credit_note: "seq_credit_note_number",
};

function assertKnownKind(kind: DocumentKind): void {
  if (!Object.prototype.hasOwnProperty.call(SEQUENCE_NAMES, kind)) {
    throw new Error(`Type de document inconnu : ${String(kind)}`);
  }
}

/**
 * Réserve le prochain numéro.
 *
 * À appeler **dans** la transaction qui insère le document, pour que le numéro
 * et la ligne apparaissent ensemble.
 *
 * Le nom de séquence est interpolé via `sql.identifier`, qui échappe et cite
 * l'identifiant — et il provient de toute façon d'une table constante, jamais
 * d'une entrée utilisateur.
 */
export async function reserveDocumentNumber(kind: DocumentKind, year: number): Promise<string> {
  assertKnownKind(kind);

  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error(`Millésime invalide : ${year}`);
  }

  const sequence = await selectNextSequenceValue(SEQUENCE_NAMES[kind]);
  return formatDocumentNumber(kind, year, sequence);
}

export function formatDocumentNumber(kind: DocumentKind, year: number, sequence: number): string {
  assertKnownKind(kind);
  return `${PREFIXES[kind]}-${year}-${String(sequence).padStart(4, "0")}`;
}

/**
 * SQL de création des séquences, à jouer par le compte de migration.
 *
 * Une séquence par millésime n'est **pas** utilisée : redémarrer à 1 chaque
 * année impose une remise à zéro annuelle, opération manuelle et donc oubliable.
 * Le millésime figure dans le libellé, la séquence reste continue.
 */
export const NUMBERING_MIGRATION_SQL = `
CREATE SEQUENCE IF NOT EXISTS seq_invoice_number AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_quote_number AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE SEQUENCE IF NOT EXISTS seq_credit_note_number AS BIGINT START WITH 1 INCREMENT BY 1 NO CYCLE;

GRANT USAGE ON SEQUENCE seq_invoice_number TO zlobodan_app;
GRANT USAGE ON SEQUENCE seq_quote_number TO zlobodan_app;
GRANT USAGE ON SEQUENCE seq_credit_note_number TO zlobodan_app;
`.trim();

export const NUMBERING_SEQUENCES = SEQUENCE_NAMES;
