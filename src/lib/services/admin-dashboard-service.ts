import "server-only";
import { count, desc, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteRequests } from "@/db/schema/quotes";
import { countAdminQuoteRequests } from "@/lib/db/repositories/quote-request-repository";
import type { ContactMessageStatus, QuoteRequestStatus } from "@/domain/request-workflow";

/**
 * Tableau de bord du back-office.
 *
 * Les indicateurs se limitent à ce que la V1 alimente réellement : demandes et
 * messages de contact. Les tuiles « devis commerciaux émis », « chantiers
 * actifs » et « € à encaisser » ont été retirées — elles lisaient bien
 * PostgreSQL, mais sur des tables qu'aucun chemin d'écriture n'alimente. Un
 * indicateur qui ne peut afficher que zéro ne mesure rien.
 *
 * Voir docs/functional-scope.md, §5.1.
 */

export interface AdminDashboard {
  requests: { total: number; active: number; urgent: number; unassigned: number };
  contacts: { total: number; unread: number };
  latest: readonly {
    id: string;
    reference: string;
    fullName: string;
    phone: string;
    postalCode: string;
    city: string;
    interventionType: string;
    status: QuoteRequestStatus;
    isUrgent: boolean;
    createdAt: Date;
  }[];
  oldestUnread: readonly {
    id: string;
    reference: string;
    fullName: string;
    subject: string;
    status: ContactMessageStatus;
    createdAt: Date;
  }[];
}

const LATEST_LIMIT = 10;
const UNREAD_LIMIT = 5;

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [requestCounters, contactRows, latest, oldestUnread] = await Promise.all([
    countAdminQuoteRequests(),
    db
      .select({
        total: count(),
        unread: sql<number>`count(*) filter (where ${contactMessages.status} = 'new')::int`,
      })
      .from(contactMessages),
    db
      .select({
        id: quoteRequests.id,
        reference: quoteRequests.reference,
        fullName: quoteRequests.fullName,
        phone: quoteRequests.phone,
        postalCode: quoteRequests.postalCode,
        city: quoteRequests.city,
        interventionType: quoteRequests.interventionType,
        status: quoteRequests.status,
        isUrgent: quoteRequests.isUrgent,
        createdAt: quoteRequests.createdAt,
      })
      .from(quoteRequests)
      .orderBy(desc(quoteRequests.createdAt))
      .limit(LATEST_LIMIT),
    // Les plus anciens non lus d'abord : c'est la file d'attente réelle du
    // bureau, pas les derniers arrivés.
    db
      .select({
        id: contactMessages.id,
        reference: contactMessages.reference,
        fullName: contactMessages.fullName,
        subject: contactMessages.subject,
        status: contactMessages.status,
        createdAt: contactMessages.createdAt,
      })
      .from(contactMessages)
      .where(sql`${contactMessages.status} = 'new'`)
      .orderBy(contactMessages.createdAt)
      .limit(UNREAD_LIMIT),
  ]);

  return {
    requests: requestCounters,
    contacts: {
      total: contactRows[0]?.total ?? 0,
      unread: contactRows[0]?.unread ?? 0,
    },
    latest,
    oldestUnread,
  };
}
