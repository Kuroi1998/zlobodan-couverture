import {
  boolean,
  check,
  index,
  integer,
  numeric,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { QuoteRequestStatus } from "@/domain/request-workflow";
import { users } from "./users";

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 32 }).notNull(),
    submissionKey: varchar("submission_key", { length: 128 }).notNull(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    fullName: varchar("full_name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }).notNull(),
    interventionType: varchar("intervention_type", { length: 100 }).notNull(),
    roofType: varchar("roof_type", { length: 100 }).notNull(),
    surface: varchar("surface", { length: 50 }).notNull(),
    isUrgent: boolean("is_urgent").notNull().default(false),
    description: text("description"),
    status: varchar("status", { length: 30 })
      .$type<QuoteRequestStatus>()
      .notNull()
      .default("submitted"),
    // Les notes internes vivent dans `internal_notes` (table dédiée) : une
    // colonne unique écrasait la note de l'opérateur précédent, sans auteur ni
    // date. Voir `src/db/schema/notes.ts`.
    consentPrivacy: boolean("consent_privacy").notNull(),
    consentAt: timestamp("consent_at", { mode: "date", withTimezone: true }),
    privacyPolicyVersion: varchar("privacy_policy_version", { length: 30 }),
    submittedAt: timestamp("submitted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("uq_quote_requests_reference").on(table.reference),
    uniqueIndex("uq_quote_requests_submission_key").on(table.submissionKey),
    index("idx_quote_req_email").on(table.email),
    index("idx_quote_req_user_id").on(table.userId),
    index("idx_quote_req_status").on(table.status),
    index("idx_quote_req_created_at").on(table.createdAt),
    // Index de l'espace client : « mes demandes, les plus récentes d'abord ».
    // C'est la requête la plus fréquente de la zone authentifiée ; l'index sur
    // `user_id` seul obligeait à trier le résultat après filtrage.
    index("idx_quote_req_user_created").on(table.userId, table.createdAt),
    check(
      "quote_requests_status_check",
      sql`${table.status} in ('draft','submitted','under_review','contacted','visit_scheduled','estimate_in_preparation','estimate_sent','accepted','rejected','cancelled','archived')`
    ),
    check(
      "quote_requests_intervention_check",
      sql`${table.interventionType} in ('refection','fuite','demoussage','gouttieres','isolation','velux','autre')`
    ),
    check(
      "quote_requests_roof_check",
      sql`${table.roofType} in ('ardoise','tuile_terre_cuite','tuile_beton','zinc','bac_acier','je_ne_sais_pas')`
    ),
    check(
      "quote_requests_surface_check",
      sql`${table.surface} in ('less_50','50-100','100-150','more_150','unknown')`
    ),
  ]
);

export const quoteAttachments = pgTable(
  "quote_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    storageKey: text("storage_key").notNull(),
    originalName: varchar("original_name", { length: 255 }).notNull(),
    storedName: varchar("stored_name", { length: 255 }).notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    width: integer("width"),
    height: integer("height"),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_quote_attachments_storage_key").on(table.storageKey),
    index("idx_quote_attachments_request").on(table.quoteRequestId),
    index("idx_quote_attachments_checksum").on(table.checksum),
    check("quote_attachments_size_check", sql`${table.sizeBytes} > 0 and ${table.sizeBytes} <= 10485760`),
    check(
      "quote_attachments_mime_check",
      sql`${table.mimeType} in ('image/png','image/jpeg','image/webp','application/pdf')`
    ),
  ]
);

export const quoteStatusHistory = pgTable(
  "quote_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteRequestId: uuid("quote_request_id")
      .notNull()
      .references(() => quoteRequests.id, { onDelete: "cascade" }),
    previousStatus: varchar("previous_status", { length: 30 }).$type<QuoteRequestStatus>(),
    newStatus: varchar("new_status", { length: 30 }).$type<QuoteRequestStatus>().notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 500 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_quote_status_history_request").on(table.quoteRequestId),
    index("idx_quote_status_history_created_at").on(table.createdAt),
    check(
      "quote_status_history_previous_check",
      sql`${table.previousStatus} is null or ${table.previousStatus} in ('draft','submitted','under_review','contacted','visit_scheduled','estimate_in_preparation','estimate_sent','accepted','rejected','cancelled','archived')`
    ),
    check(
      "quote_status_history_new_check",
      sql`${table.newStatus} in ('draft','submitted','under_review','contacted','visit_scheduled','estimate_in_preparation','estimate_sent','accepted','rejected','cancelled','archived')`
    ),
  ]
);

export const quotes = pgTable(
  "quotes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 50 }).notNull().unique(), // ex: DEV-2026-0001
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    quoteRequestId: uuid("quote_request_id").references(() => quoteRequests.id, { onDelete: "set null" }),
    status: varchar("status", { length: 30 }).notNull().default("draft"), // 'draft' | 'sent' | 'accepted' | 'refused' | 'expired'
    amountHt: numeric("amount_ht", { precision: 12, scale: 2 }).notNull().default("0.00"),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    amountTtc: numeric("amount_ttc", { precision: 12, scale: 2 }).notNull().default("0.00"),
    validUntil: timestamp("valid_until", { mode: "date", withTimezone: true }).notNull(),
    pdfPath: text("pdf_path"),
    signedAt: timestamp("signed_at", { mode: "date", withTimezone: true }),
    signedIpHash: varchar("signed_ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_quotes_number").on(table.number),
    index("idx_quotes_user_id").on(table.userId),
    index("idx_quotes_status").on(table.status),
  ]
);

export const quoteLines = pgTable(
  "quote_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quoteId: uuid("quote_id")
      .notNull()
      .references(() => quotes.id, { onDelete: "cascade" }),
    designation: text("designation").notNull(),
    quantity: numeric("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
    unit: varchar("unit", { length: 30 }).notNull().default("m²"), // 'm²', 'm', 'forfait', 'pièce'
    unitPriceHt: numeric("unit_price_ht", { precision: 12, scale: 2 }).notNull().default("0.00"),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }).notNull().default("6.00"), // 6.00% (TVA Belgique)
  },
  (table) => [
    index("idx_quote_lines_quote_id").on(table.quoteId),
  ]
);
