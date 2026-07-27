import { pgTable, uuid, varchar, text, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    userAgent: text("user_agent"),
    deviceName: varchar("device_name", { length: 160 }),
    ipHash: varchar("ip_hash", { length: 64 }),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    // Dernière activité observée : alimente le délai d'inactivité, très court
    // pour les rôles privilégiés (voir SESSION_TIMEOUTS).
    lastSeenAt: timestamp("last_seen_at", { mode: "date", withTimezone: true }),
    authenticatedAt: timestamp("authenticated_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    lastVerifiedAt: timestamp("last_verified_at", {
      mode: "date",
      withTimezone: true,
    })
      .notNull()
      .defaultNow(),
    revokedAt: timestamp("revoked_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_sessions_user_id").on(table.userId),
    index("idx_sessions_token_hash").on(table.tokenHash),
    index("idx_sessions_active").on(table.userId, table.revokedAt, table.expiresAt),
  ]
);
