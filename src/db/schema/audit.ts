import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    action: varchar("action", { length: 100 }).notNull(),
    targetTable: varchar("target_table", { length: 100 }).notNull(),
    targetId: varchar("target_id", { length: 100 }),
    diff: text("diff"), // Stringified JSON diff
    ipHash: varchar("ip_hash", { length: 64 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_audit_user_id").on(table.userId),
    index("idx_audit_action").on(table.action),
    index("idx_audit_target_table").on(table.targetTable),
  ]
);
