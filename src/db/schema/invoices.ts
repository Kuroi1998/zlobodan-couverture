import { pgTable, uuid, varchar, text, timestamp, numeric, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { quotes } from "./quotes";

export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 50 }).notNull().unique(), // Sequential ex: FACT-2026-0001
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: varchar("status", { length: 30 }).notNull().default("issued"), // 'issued' | 'paid' | 'overdue' | 'cancelled'
    amountHt: numeric("amount_ht", { precision: 12, scale: 2 }).notNull().default("0.00"),
    vatAmount: numeric("vat_amount", { precision: 12, scale: 2 }).notNull().default("0.00"),
    amountTtc: numeric("amount_ttc", { precision: 12, scale: 2 }).notNull().default("0.00"),
    issuedAt: timestamp("issued_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    dueAt: timestamp("due_at", { mode: "date", withTimezone: true }).notNull(),
    paidAt: timestamp("paid_at", { mode: "date", withTimezone: true }),
    pdfPath: text("pdf_path"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_invoices_number").on(table.number),
    index("idx_invoices_user_id").on(table.userId),
    index("idx_invoices_quote_id").on(table.quoteId),
    index("idx_invoices_status").on(table.status),
  ]
);

export const creditNotes = pgTable(
  "credit_notes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: varchar("number", { length: 50 }).notNull().unique(), // ex: AV-2026-0001
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    amountTtc: numeric("amount_ttc", { precision: 12, scale: 2 }).notNull().default("0.00"),
    reason: text("reason").notNull(),
    issuedAt: timestamp("issued_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    pdfPath: text("pdf_path"),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_credit_notes_number").on(table.number),
    index("idx_credit_notes_invoice_id").on(table.invoiceId),
  ]
);
