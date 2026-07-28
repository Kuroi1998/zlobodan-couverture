import {
  check,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export type NotificationStatus = "pending" | "processing" | "sent" | "failed";

export const notificationOutbox = pgTable(
  "notification_outbox",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventType: varchar("event_type", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 40 }).notNull(),
    entityId: uuid("entity_id").notNull(),
    recipient: varchar("recipient", { length: 255 }).notNull(),
    payload: jsonb("payload").$type<Record<string, string>>().notNull().default({}),
    encryptedPayload: text("encrypted_payload"),
    status: varchar("status", { length: 20 })
      .$type<NotificationStatus>()
      .notNull()
      .default("pending"),
    attemptCount: integer("attempt_count").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    sentAt: timestamp("sent_at", { mode: "date", withTimezone: true }),
    lastError: text("last_error"),
  },
  (table) => [
    index("idx_notification_outbox_dispatch").on(table.status, table.nextAttemptAt),
    index("idx_notification_outbox_entity").on(table.entityType, table.entityId),
    check(
      "notification_outbox_status_check",
      sql`${table.status} in ('pending','processing','sent','failed')`
    ),
  ]
);
