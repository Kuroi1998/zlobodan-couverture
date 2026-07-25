import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { invoices } from "@/db/schema/invoices";
import { quoteLines, quoteRequests, quotes } from "@/db/schema/quotes";
import type { PdfDocumentData } from "@/lib/services/pdf-service";

/**
 * Accès aux documents commerciaux.
 *
 * Toutes les lectures sont paramétrées par Drizzle — aucune interpolation de
 * chaîne SQL. Les fonctions retournent systématiquement le propriétaire de la
 * ressource pour que l'appelant puisse trancher l'appartenance : une requête
 * qui ne rapporte pas son `ownerId` invite à oublier le contrôle.
 */

export interface OwnedDocument<T> {
  ownerId: string | null;
  document: T;
}

function formatBelgianDate(value: Date | null): string {
  if (!value) return "—";
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${value.getUTCFullYear()}`;
}

function toNumber(value: string | number | null): number {
  const n = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

async function loadQuoteLines(quoteId: string) {
  const rows = await db
    .select({
      designation: quoteLines.designation,
      quantity: quoteLines.quantity,
      unit: quoteLines.unit,
      unitPriceHt: quoteLines.unitPriceHt,
      vatRate: quoteLines.vatRate,
    })
    .from(quoteLines)
    .where(eq(quoteLines.quoteId, quoteId))
    .orderBy(asc(quoteLines.designation));

  return rows.map((l) => ({
    designation: l.designation,
    qty: toNumber(l.quantity),
    unit: l.unit,
    priceHt: toNumber(l.unitPriceHt),
    vatRate: toNumber(l.vatRate),
  }));
}

/** Identité affichée sur le document : issue de la demande de devis, sinon du compte. */
function clientIdentity(
  requestName: string | null,
  requestCity: string | null,
  requestPostal: string | null,
  accountEmail: string | null
): { clientName: string; clientAddress: string } {
  return {
    clientName: requestName ?? accountEmail ?? "Client",
    clientAddress:
      requestPostal && requestCity ? `${requestPostal} ${requestCity}` : "Adresse non renseignée",
  };
}

export async function findQuoteForPdf(
  quoteId: string
): Promise<OwnedDocument<PdfDocumentData> | null> {
  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      userId: quotes.userId,
      status: quotes.status,
      amountHt: quotes.amountHt,
      vatAmount: quotes.vatAmount,
      amountTtc: quotes.amountTtc,
      validUntil: quotes.validUntil,
      createdAt: quotes.createdAt,
      requestName: quoteRequests.fullName,
      requestCity: quoteRequests.city,
      requestPostal: quoteRequests.postalCode,
      accountEmail: users.email,
    })
    .from(quotes)
    .leftJoin(quoteRequests, eq(quotes.quoteRequestId, quoteRequests.id))
    .leftJoin(users, eq(quotes.userId, users.id))
    .where(eq(quotes.id, quoteId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const lines = await loadQuoteLines(row.id);

  return {
    ownerId: row.userId,
    document: {
      type: "quote",
      number: row.number,
      date: formatBelgianDate(row.createdAt),
      dueDateOrValidity: formatBelgianDate(row.validUntil),
      ...clientIdentity(row.requestName, row.requestCity, row.requestPostal, row.accountEmail),
      lines,
      amountHt: toNumber(row.amountHt),
      vatAmount: toNumber(row.vatAmount),
      amountTtc: toNumber(row.amountTtc),
    },
  };
}

export async function findInvoiceForPdf(
  invoiceId: string
): Promise<OwnedDocument<PdfDocumentData> | null> {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      userId: invoices.userId,
      quoteId: invoices.quoteId,
      amountHt: invoices.amountHt,
      vatAmount: invoices.vatAmount,
      amountTtc: invoices.amountTtc,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      requestName: quoteRequests.fullName,
      requestCity: quoteRequests.city,
      requestPostal: quoteRequests.postalCode,
      accountEmail: users.email,
    })
    .from(invoices)
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .leftJoin(quoteRequests, eq(quotes.quoteRequestId, quoteRequests.id))
    .leftJoin(users, eq(invoices.userId, users.id))
    .where(eq(invoices.id, invoiceId))
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  const lines = row.quoteId ? await loadQuoteLines(row.quoteId) : [];

  return {
    ownerId: row.userId,
    document: {
      type: "invoice",
      number: row.number,
      date: formatBelgianDate(row.issuedAt),
      dueDateOrValidity: formatBelgianDate(row.dueAt),
      ...clientIdentity(row.requestName, row.requestCity, row.requestPostal, row.accountEmail),
      lines,
      amountHt: toNumber(row.amountHt),
      vatAmount: toNumber(row.vatAmount),
      amountTtc: toNumber(row.amountTtc),
    },
  };
}

export interface QuoteDecisionTarget {
  id: string;
  number: string;
  ownerId: string | null;
  status: string;
  validUntil: Date;
}

export async function findQuoteForDecision(quoteId: string): Promise<QuoteDecisionTarget | null> {
  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      ownerId: quotes.userId,
      status: quotes.status,
      validUntil: quotes.validUntil,
    })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  return rows[0] ?? null;
}
