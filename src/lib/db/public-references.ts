import { sql } from "drizzle-orm";
import type { db } from "@/db/client";

export type PublicReferenceKind = "contact" | "quote_request";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const PREFIXES: Record<PublicReferenceKind, string> = {
  contact: "CNT",
  quote_request: "DEV",
};

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
  const query =
    kind === "contact"
      ? sql<{ value: string }>`select nextval('seq_contact_reference')::text as value`
      : sql<{ value: string }>`select nextval('seq_quote_request_reference')::text as value`;
  const rows = await transaction.execute(query);
  const sequence = Number(rows[0]?.value);
  return formatPublicReference(kind, now.getUTCFullYear(), sequence);
}
