import "server-only";
import { and, count, desc, eq, inArray, notInArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteAttachments, quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import { users } from "@/db/schema/users";
import type { QuoteRequestStatus } from "@/domain/request-workflow";

/**
 * Accès aux demandes de devis.
 *
 * Deux règles tiennent tout ce fichier :
 *
 *  1. **Aucune fonction destinée au client n'accepte un identifiant sans
 *     propriétaire.** La signature impose `ownerId`, et la clause `where`
 *     l'inclut toujours. Il est donc impossible d'écrire ici l'équivalent d'un
 *     `where id = ?` non filtré, qui est la forme exacte de la faille d'accès
 *     horizontal.
 *  2. **Aucune requête n'est non bornée.** Les listes prennent une pagination,
 *     les agrégats sont calculés par PostgreSQL.
 *
 * Les fonctions renvoient des modèles typés, jamais une ligne brute du pilote.
 */

/** Statuts considérés comme « dossier clos » — utilisé par les compteurs. */
const CLOSED_STATUSES: readonly QuoteRequestStatus[] = [
  "accepted",
  "rejected",
  "cancelled",
  "archived",
];

export interface ClientQuoteRequestListItem {
  reference: string;
  status: QuoteRequestStatus;
  interventionType: string;
  roofType: string;
  surface: string;
  city: string;
  postalCode: string;
  isUrgent: boolean;
  createdAt: Date;
  updatedAt: Date;
  attachmentCount: number;
}

export interface Paginated<T> {
  items: readonly T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
}

function toPaginated<T>(
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

/**
 * Liste paginée des demandes d'un client.
 *
 * Le nombre de pièces jointes est agrégé par une sous-requête corrélée plutôt
 * que par une requête par ligne : la version naïve produisait N+1 requêtes sur
 * une page de vingt demandes.
 */
export async function listClientQuoteRequests(params: {
  ownerId: string;
  page: number;
  pageSize: number;
  status?: QuoteRequestStatus;
}): Promise<Paginated<ClientQuoteRequestListItem>> {
  const conditions = [eq(quoteRequests.userId, params.ownerId)];
  if (params.status) conditions.push(eq(quoteRequests.status, params.status));
  const where = and(...conditions);

  const attachmentCount = sql<number>`(
    select count(*)::int from ${quoteAttachments}
    where ${quoteAttachments.quoteRequestId} = ${quoteRequests.id}
      and ${quoteAttachments.deletedAt} is null
  )`;

  const [rows, totals] = await Promise.all([
    db
      .select({
        reference: quoteRequests.reference,
        status: quoteRequests.status,
        interventionType: quoteRequests.interventionType,
        roofType: quoteRequests.roofType,
        surface: quoteRequests.surface,
        city: quoteRequests.city,
        postalCode: quoteRequests.postalCode,
        isUrgent: quoteRequests.isUrgent,
        createdAt: quoteRequests.createdAt,
        updatedAt: quoteRequests.updatedAt,
        attachmentCount,
      })
      .from(quoteRequests)
      .where(where)
      .orderBy(desc(quoteRequests.createdAt))
      .limit(params.pageSize)
      .offset((params.page - 1) * params.pageSize),
    db.select({ value: count() }).from(quoteRequests).where(where),
  ]);

  return toPaginated(rows, totals[0]?.value ?? 0, params.page, params.pageSize);
}

export interface ClientQuoteRequestAttachment {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
}

export interface ClientQuoteRequestHistoryEntry {
  previousStatus: QuoteRequestStatus | null;
  newStatus: QuoteRequestStatus;
  createdAt: Date;
}

export interface ClientQuoteRequestDetail {
  id: string;
  reference: string;
  status: QuoteRequestStatus;
  interventionType: string;
  roofType: string;
  surface: string;
  city: string;
  postalCode: string;
  isUrgent: boolean;
  description: string | null;
  fullName: string;
  email: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
  submittedAt: Date | null;
  attachments: readonly ClientQuoteRequestAttachment[];
  history: readonly ClientQuoteRequestHistoryEntry[];
}

/**
 * Détail d'une demande, pour son propriétaire.
 *
 * La référence sert de clé d'accès publique et le propriétaire est dans la
 * même clause : deux conditions, une seule requête, pas de fenêtre entre la
 * lecture et le contrôle.
 *
 * Ce que la projection **n'expose pas** est aussi important que ce qu'elle
 * expose : ni notes internes, ni identifiant du responsable, ni motif de
 * changement de statut. L'historique est réduit aux transitions et à leur
 * date — le champ `reason` est rédigé pour l'interne.
 */
export async function findClientQuoteRequestByReference(params: {
  ownerId: string;
  reference: string;
}): Promise<ClientQuoteRequestDetail | null> {
  const rows = await db
    .select({
      id: quoteRequests.id,
      reference: quoteRequests.reference,
      status: quoteRequests.status,
      interventionType: quoteRequests.interventionType,
      roofType: quoteRequests.roofType,
      surface: quoteRequests.surface,
      city: quoteRequests.city,
      postalCode: quoteRequests.postalCode,
      isUrgent: quoteRequests.isUrgent,
      description: quoteRequests.description,
      fullName: quoteRequests.fullName,
      email: quoteRequests.email,
      phone: quoteRequests.phone,
      createdAt: quoteRequests.createdAt,
      updatedAt: quoteRequests.updatedAt,
      submittedAt: quoteRequests.submittedAt,
    })
    .from(quoteRequests)
    .where(
      and(
        eq(quoteRequests.reference, params.reference),
        eq(quoteRequests.userId, params.ownerId)
      )
    )
    .limit(1);

  const request = rows[0];
  if (!request) return null;

  const [attachments, history] = await Promise.all([
    db
      .select({
        id: quoteAttachments.id,
        originalName: quoteAttachments.originalName,
        mimeType: quoteAttachments.mimeType,
        sizeBytes: quoteAttachments.sizeBytes,
        createdAt: quoteAttachments.createdAt,
      })
      .from(quoteAttachments)
      .where(
        and(
          eq(quoteAttachments.quoteRequestId, request.id),
          sql`${quoteAttachments.deletedAt} is null`
        )
      )
      .orderBy(desc(quoteAttachments.createdAt))
      .limit(50),
    db
      .select({
        previousStatus: quoteStatusHistory.previousStatus,
        newStatus: quoteStatusHistory.newStatus,
        createdAt: quoteStatusHistory.createdAt,
      })
      .from(quoteStatusHistory)
      .where(eq(quoteStatusHistory.quoteRequestId, request.id))
      .orderBy(desc(quoteStatusHistory.createdAt))
      .limit(50),
  ]);

  return { ...request, attachments, history };
}

export interface ClientRequestCounters {
  total: number;
  active: number;
  attachments: number;
}

/**
 * Compteurs du tableau de bord client, en une requête.
 *
 * `count(*) filter (where …)` évite trois allers-retours pour trois chiffres
 * calculés sur la même table.
 */
export async function countClientQuoteRequests(
  ownerId: string
): Promise<ClientRequestCounters> {
  const rows = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${notInArray(quoteRequests.status, [...CLOSED_STATUSES])})::int`,
      attachments: sql<number>`(
        select count(*)::int from ${quoteAttachments}
        inner join ${quoteRequests} as owned
          on owned.id = ${quoteAttachments.quoteRequestId}
        where owned.user_id = ${ownerId}
          and ${quoteAttachments.deletedAt} is null
      )`,
    })
    .from(quoteRequests)
    .where(eq(quoteRequests.userId, ownerId));

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    attachments: row?.attachments ?? 0,
  };
}

export interface AdminRequestCounters {
  total: number;
  active: number;
  urgent: number;
  unassigned: number;
}

export async function countAdminQuoteRequests(): Promise<AdminRequestCounters> {
  const rows = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${notInArray(quoteRequests.status, [...CLOSED_STATUSES])})::int`,
      urgent: sql<number>`count(*) filter (where ${quoteRequests.isUrgent} and ${notInArray(quoteRequests.status, [...CLOSED_STATUSES])})::int`,
      unassigned: sql<number>`count(*) filter (where ${
        quoteRequests.assignedToUserId
      } is null and ${notInArray(quoteRequests.status, [...CLOSED_STATUSES])})::int`,
    })
    .from(quoteRequests);

  const row = rows[0];
  return {
    total: row?.total ?? 0,
    active: row?.active ?? 0,
    urgent: row?.urgent ?? 0,
    unassigned: row?.unassigned ?? 0,
  };
}

export interface AssignableOperator {
  value: string;
  label: string;
}

/** Opérateurs affectables : comptes `staff` ou `admin` non désactivés. */
export async function listAssignableOperators(): Promise<readonly AssignableOperator[]> {
  return db
    .select({ value: users.id, label: users.email })
    .from(users)
    .where(and(inArray(users.role, ["staff", "admin"]), sql`${users.deletedAt} is null`))
    .orderBy(users.email)
    .limit(100);
}
