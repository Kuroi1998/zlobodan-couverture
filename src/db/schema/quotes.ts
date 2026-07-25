import { pgTable, uuid, varchar, text, timestamp, numeric, boolean, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
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
    status: varchar("status", { length: 30 }).notNull().default("pending"), // 'pending' | 'reviewed' | 'converted'
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    emailIdx: index("idx_quote_req_email").on(table.email),
    userIdIdx: index("idx_quote_req_user_id").on(table.userId),
  })
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
  (table) => ({
    numberIdx: index("idx_quotes_number").on(table.number),
    userIdIdx: index("idx_quotes_user_id").on(table.userId),
    statusIdx: index("idx_quotes_status").on(table.status),
  })
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
  (table) => ({
    quoteIdIdx: index("idx_quote_lines_quote_id").on(table.quoteId),
  })
);
