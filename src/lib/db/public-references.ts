import { sql } from "drizzle-orm";
import type { db } from "@/db/client";

export type PublicReferenceKind = "contact" | "quote_request" | "document";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PREFIXES: Record<PublicReferenceKind, string> = {
  contact: "CNT",
  quote_request: "DEV",
  // Récapitulatif : le document porte sa propre référence, distincte de celle
  // de la demande dont il est issu. Une demande peut donner lieu à plusieurs
  // documents, et confondre les deux rendrait l'un des deux ambigu.
  document: "REC",
};

function sequenceQuery(kind: PublicReferenceKind) {
  switch (kind) {
    case "contact":
      return sql<{ value: string }>`select nextval('seq_contact_reference')::text as value`;
    case "quote_request":
      return sql<{ value: string }>`select nextval('seq_quote_request_reference')::text as value`;
    case "document":
      return sql<{ value: string }>`select nextval('seq_document_reference')::text as value`;
  }
}

export function formatPublicReference(
  kind: PublicReferenceKind,
  year: number,
  sequence: number
): string {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Millésime invalide.");
  }
  if (!Number.isInteger(sequence) || sequence < 1) {
    throw new Error("Numéro de séquence invalide.");
  }
  return `${PREFIXES[kind]}-${year}-${String(sequence).padStart(6, "0")}`;
}

export async function reservePublicReference(
  transaction: DbTransaction,
  kind: PublicReferenceKind,
  now = new Date()
): Promise<string> {
  // Aiguillage exhaustif plutôt qu'un ternaire : avec deux valeurs, « tout ce
  // qui n'est pas un contact » désignait la demande de devis. L'ajout d'un
  // troisième type aurait silencieusement puisé dans la mauvaise séquence, et
  // deux documents distincts auraient porté le même numéro.
  //
  // Les noms de séquence restent des littéraux constants : jamais interpolés,
  // jamais reçus de l'extérieur.
  const rows = await transaction.execute(sequenceQuery(kind));
  const sequence = Number(rows[0]?.value);
  return formatPublicReference(kind, now.getUTCFullYear(), sequence);
}
