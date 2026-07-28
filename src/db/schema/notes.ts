import {
  check,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { users } from "./users";

/**
 * Notes internes du back-office.
 *
 * Elles vivaient dans une colonne `internal_notes` unique sur
 * `contact_messages` et `quote_requests`, écrasée à chaque enregistrement. Trois
 * conséquences : aucun auteur, aucun horodatage, et la note d'un opérateur
 * effacée sans trace par le suivant.
 *
 * Une table dédiée règle les trois. Le rattachement est polymorphe — deux
 * entités seulement, contraintes par un `CHECK` — plutôt que deux tables
 * jumelles : la note n'a aucune sémantique propre à son porteur.
 *
 * Pas de clé étrangère sur `entity_id` : PostgreSQL ne sait pas référencer
 * deux tables depuis une même colonne. La cohérence est donc assurée par le
 * service, qui vérifie l'existence de l'entité dans la même transaction.
 */

export const INTERNAL_NOTE_ENTITY_TYPES = ["contact_message", "quote_request"] as const;

export type InternalNoteEntityType = (typeof INTERNAL_NOTE_ENTITY_TYPES)[number];

export const internalNotes = pgTable(
  "internal_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    entityType: varchar("entity_type", { length: 40 })
      .$type<InternalNoteEntityType>()
      .notNull(),
    entityId: uuid("entity_id").notNull(),
    content: text("content").notNull(),
    // `set null` et non `cascade` : le départ d'un opérateur ne doit pas
    // effacer les notes qu'il a laissées sur les dossiers en cours.
    authorUserId: uuid("author_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    // Index composite dans l'ordre de lecture réel : « les notes de ce
    // dossier, les plus récentes d'abord ». Un index sur `entity_id` seul
    // laisserait le tri à la charge du moteur.
    index("idx_internal_notes_entity").on(
      table.entityType,
      table.entityId,
      table.createdAt
    ),
    index("idx_internal_notes_author").on(table.authorUserId),
    check(
      "internal_notes_entity_type_check",
      sql`${table.entityType} in ('contact_message','quote_request')`
    ),
    check(
      "internal_notes_content_check",
      sql`length(${table.content}) between 1 and 5000`
    ),
  ]
);
