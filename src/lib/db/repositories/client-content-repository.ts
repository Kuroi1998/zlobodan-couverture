import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteAttachments, quoteRequests } from "@/db/schema/quotes";
import type { ContactMessageStatus } from "@/domain/request-workflow";
import type { Paginated } from "./quote-request-repository";

/**
 * Contenus rattachés au compte : pièces jointes et historique d'échanges.
 *
 * Comme partout dans l'espace client, `ownerId` est un paramètre obligatoire
 * et figure dans la clause `where`. Les deux listes sont paginées : elles
 * chargeaient auparavant cent lignes fixes, ce qui n'est pas une limite mais
 * un pari sur le volume.
 */

function paginate<T>(
  items: readonly T[],
  total: number,
  page: number,
  pageSize: number
): Paginated<T> {
  return {
    items,
    total,
    page,
    pageSize,
    pageCount: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export interface ClientAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  requestReference: string;
}

export async function listClientAttachments(params: {
  ownerId: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<ClientAttachment>> {
  const where = and(
    eq(quoteRequests.userId, params.ownerId),
    isNull(quoteAttachments.deletedAt)
  );

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: quoteAttachments.id,
        originalName: quoteAttachments.originalName,
        mimeType: quoteAttachments.mimeType,
        sizeBytes: quoteAttachments.sizeBytes,
        createdAt: quoteAttachments.createdAt,
        requestReference: quoteRequests.reference,
      })
      .from(quoteAttachments)
      .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
      .where(where)
      .orderBy(desc(quoteAttachments.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db
      .select({ value: count() })
      .from(quoteAttachments)
      .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
      .where(where),
  ]);

  return paginate(rows, totals[0]?.value ?? 0, params.page, params.pageSize);
}

export interface ClientExchange {
  id: string;
  reference: string;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  createdAt: Date;
  repliedAt: Date | null;
}

export async function listClientExchanges(params: {
  ownerId: string;
  page: number;
  pageSize: number;
}): Promise<Paginated<ClientExchange>> {
  const where = eq(contactMessages.userId, params.ownerId);

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: contactMessages.id,
        reference: contactMessages.reference,
        subject: contactMessages.subject,
        message: contactMessages.message,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
        repliedAt: contactMessages.repliedAt,
      })
      .from(contactMessages)
      .where(where)
      .orderBy(desc(contactMessages.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ value: count() }).from(contactMessages).where(where),
  ]);

  return paginate(rows, totals[0]?.value ?? 0, params.page, params.pageSize);
}
