import {
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sessions } from "./sessions";
import { users } from "./users";

export const securityEvents = pgTable(
  "security_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    sessionId: uuid("session_id").references(() => sessions.id, {
      onDelete: "set null",
    }),
    eventType: varchar("event_type", { length: 100 }).notNull(),
    severity: varchar("severity", { length: 20 }).notNull(),
    route: varchar("route", { length: 255 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_security_events_user").on(table.userId, table.createdAt),
    index("idx_security_events_type").on(table.eventType, table.createdAt),
    index("idx_security_events_created").on(table.createdAt),
  ]
);
