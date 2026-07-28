import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { quotes } from "./quotes";

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    quoteId: uuid("quote_id").references(() => quotes.id, { onDelete: "set null" }),
    address: text("address").notNull(),
    roofType: varchar("roof_type", { length: 100 }).notNull(),
    status: varchar("status", { length: 30 }).notNull().default("planned"), // 'planned' | 'in_progress' | 'completed'
    startDate: timestamp("start_date", { mode: "date", withTimezone: true }),
    endDate: timestamp("end_date", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_projects_user_id").on(table.userId),
    index("idx_projects_quote_id").on(table.quoteId),
    index("idx_projects_status").on(table.status),
  ]
);
