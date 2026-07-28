import "server-only";
import { and, count, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import {
  countClientQuoteRequests,
  findClientQuoteRequestByReference,
  listClientQuoteRequests,
  type ClientQuoteRequestDetail,
  type ClientQuoteRequestListItem,
  type Paginated,
} from "@/lib/db/repositories/quote-request-repository";
import {
  canTransitionQuoteRequest,
  type QuoteRequestStatus,
} from "@/domain/request-workflow";
import { logAuditEvent } from "./audit-service";

/**
 * Services de l'espace client.
 *
 * Contrat commun à toutes les fonctions de ce module : **l'identifiant du
 * propriétaire est un paramètre obligatoire, et il provient de la session
 * serveur.** Aucune n'accepte de champ `userId` transitant par le navigateur.
 * Les appelants — composants serveur et Server Actions — résolvent la session
 * eux-mêmes et transmettent `user.id`.
 *
 * Les fonctions renvoient un résultat métier discriminé plutôt que de lever :
 * l'appelant doit traiter le refus, il ne peut pas l'oublier dans un `catch`
 * générique.
 */

export interface ClientDashboard {
  requests: { total: number; active: number };
  attachments: number;
  exchanges: number;
  latest: readonly {
    reference: string;
    status: QuoteRequestStatus;
    interventionType: string;
    city: string;
    createdAt: Date;
  }[];
}

/**
 * Tableau de bord client.
 *
 * Quatre requêtes concurrentes, toutes bornées et toutes filtrées sur le
 * propriétaire. Aucune ne rapporte de ligne complète : seuls les agrégats et
 * les cinq dernières demandes sont chargés.
 */
export async function getClientDashboard(ownerId: string): Promise<ClientDashboard> {
  const [counters, exchangeRows, latest] = await Promise.all([
    countClientQuoteRequests(ownerId),
    db
      .select({ value: count() })
      .from(contactMessages)
      .where(eq(contactMessages.userId, ownerId)),
    db
      .select({
        reference: quoteRequests.reference,
        status: quoteRequests.status,
        interventionType: quoteRequests.interventionType,
        city: quoteRequests.city,
        createdAt: quoteRequests.createdAt,
      })
      .from(quoteRequests)
      .where(eq(quoteRequests.userId, ownerId))
      .orderBy(desc(quoteRequests.createdAt))
      .limit(5),
  ]);

  return {
    requests: { total: counters.total, active: counters.active },
    attachments: counters.attachments,
    exchanges: exchangeRows[0]?.value ?? 0,
    latest,
  };
}

export async function listClientRequests(params: {
  ownerId: string;
  page: number;
  pageSize: number;
  status?: QuoteRequestStatus;
}): Promise<Paginated<ClientQuoteRequestListItem>> {
  return listClientQuoteRequests(params);
}

export async function getClientRequestByReference(params: {
  ownerId: string;
  reference: string;
}): Promise<ClientQuoteRequestDetail | null> {
  return findClientQuoteRequestByReference(params);
}

export type CancelRequestResult =
  | { outcome: "cancelled"; reference: string }
  | { outcome: "not-found" }
  | { outcome: "not-cancellable"; status: QuoteRequestStatus };

/**
 * Annulation d'une demande par son propriétaire.
 *
 * Trois verrous, dans cet ordre :
 *
 *  1. la lecture est filtrée sur le propriétaire — une demande qui ne lui
 *     appartient pas est « introuvable », sans distinction ;
 *  2. la machine à états tranche : seules les transitions déclarées vers
 *     `cancelled` passent. Une demande déjà acceptée ou archivée ne s'annule
 *     pas ;
 *  3. la mise à jour est conditionnée au statut lu. Deux clics simultanés ne
 *     produisent qu'une annulation, et la seconde repart en conflit.
 *
 * Le tout dans une transaction, avec l'entrée d'historique : un dossier ne
 * peut pas se retrouver annulé sans trace de qui l'a annulé et quand.
 */
export async function cancelQuoteRequest(params: {
  ownerId: string;
  reference: string;
  reason?: string;
}): Promise<CancelRequestResult> {
  const result = await db.transaction<CancelRequestResult>(async (transaction) => {
    const rows = await transaction
      .select({ id: quoteRequests.id, status: quoteRequests.status })
      .from(quoteRequests)
      .where(
        and(
          eq(quoteRequests.reference, params.reference),
          eq(quoteRequests.userId, params.ownerId)
        )
      )
      .limit(1);

    const request = rows[0];
    if (!request) return { outcome: "not-found" };

    if (!canTransitionQuoteRequest(request.status, "cancelled")) {
      return { outcome: "not-cancellable", status: request.status };
    }

    const now = new Date();
    const updated = await transaction
      .update(quoteRequests)
      .set({ status: "cancelled", updatedAt: now })
      .where(
        and(
          eq(quoteRequests.id, request.id),
          eq(quoteRequests.status, request.status),
          eq(quoteRequests.userId, params.ownerId)
        )
      )
      .returning({ id: quoteRequests.id });

    if (updated.length === 0) {
      return { outcome: "not-cancellable", status: request.status };
    }

    await transaction.insert(quoteStatusHistory).values({
      quoteRequestId: request.id,
      previousStatus: request.status,
      newStatus: "cancelled",
      changedByUserId: params.ownerId,
      reason: params.reason ?? "Annulation par le client",
      createdAt: now,
    });

    return { outcome: "cancelled", reference: params.reference };
  });

  if (result.outcome === "cancelled") {
    await logAuditEvent({
      userId: params.ownerId,
      action: "quote_request.cancelled_by_client",
      targetTable: "quote_requests",
      targetId: params.reference,
      diff: { status: "cancelled" },
    });
  }

  return result;
}
