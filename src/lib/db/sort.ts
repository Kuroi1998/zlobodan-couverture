import { asc, desc, type SQL } from "drizzle-orm";
import type { PgColumn } from "drizzle-orm/pg-core";
import { invoices } from "@/db/schema/invoices";
import { quoteRequests, quotes } from "@/db/schema/quotes";
import { auditLog } from "@/db/schema/audit";

/**
 * Tri dynamique par liste blanche.
 *
 * Le tri est l'endroit où les requêtes paramétrées ne protègent plus : un nom
 * de colonne n'est pas une valeur, il ne peut pas être passé en paramètre lié.
 * La seule construction sûre consiste donc à ne jamais utiliser la chaîne
 * reçue, mais à s'en servir comme *clé de recherche* dans une table de
 * colonnes connues à la compilation.
 *
 * Une valeur inconnue ne produit pas d'erreur exploitable : elle retombe sur
 * le tri par défaut.
 */

type SortMap = Record<string, PgColumn>;

/** Colonnes exposées au tri, par ressource. Tout le reste est refusé. */
const SORTABLE: Record<string, { columns: SortMap; fallback: string }> = {
  quotes: {
    columns: {
      number: quotes.number,
      status: quotes.status,
      amountTtc: quotes.amountTtc,
      validUntil: quotes.validUntil,
      createdAt: quotes.createdAt,
    },
    fallback: "createdAt",
  },
  invoices: {
    columns: {
      number: invoices.number,
      status: invoices.status,
      amountTtc: invoices.amountTtc,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
    },
    fallback: "issuedAt",
  },
  quoteRequests: {
    columns: {
      city: quoteRequests.city,
      status: quoteRequests.status,
      createdAt: quoteRequests.createdAt,
    },
    fallback: "createdAt",
  },
  auditLog: {
    columns: {
      action: auditLog.action,
      targetTable: auditLog.targetTable,
      createdAt: auditLog.createdAt,
    },
    fallback: "createdAt",
  },
};

export type SortableResource = keyof typeof SORTABLE;

export type SortDirection = "asc" | "desc";

export function parseSortDirection(raw: unknown): SortDirection {
  return raw === "asc" ? "asc" : "desc";
}

/**
 * Résout une paire (colonne, sens) en clause de tri Drizzle.
 * `requestedColumn` peut venir d'une requête HTTP sans risque : elle sert
 * uniquement de clé de recherche.
 */
export function resolveOrderBy(
  resource: SortableResource,
  requestedColumn: unknown,
  requestedDirection: unknown
): SQL {
  const config = SORTABLE[resource];
  const key =
    typeof requestedColumn === "string" && Object.prototype.hasOwnProperty.call(config.columns, requestedColumn)
      ? requestedColumn
      : config.fallback;

  const column = config.columns[key];
  return parseSortDirection(requestedDirection) === "asc" ? asc(column) : desc(column);
}

/** Exposé pour les tests et pour construire les menus de tri de l'interface. */
export function allowedSortColumns(resource: SortableResource): string[] {
  return Object.keys(SORTABLE[resource].columns);
}
