import { sql } from "drizzle-orm";
import {
  bigint,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { users } from "./users";

export const emailChangeRequests = pgTable(
  "email_change_requests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    newEmail: varchar("new_email", { length: 255 }).notNull(),
    normalizedNewEmail: varchar("normalized_new_email", { length: 255 }).notNull(),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    confirmedAt: timestamp("confirmed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_email_change_user").on(table.userId),
    index("idx_email_change_token").on(table.tokenHash),
    uniqueIndex("uq_pending_email_change")
      .on(table.normalizedNewEmail)
      .where(sql`${table.confirmedAt} is null`),
  ]
);

export const userTwoFactor = pgTable(
  "user_two_factor",
  {
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    enabled: integer("enabled").notNull().default(0),
    encryptedSecret: text("encrypted_secret").notNull(),
    confirmedAt: timestamp("confirmed_at", { mode: "date", withTimezone: true }),
    pendingExpiresAt: timestamp("pending_expires_at", {
      mode: "date",
      withTimezone: true,
    }),
    lastUsedTimeStep: bigint("last_used_time_step", { mode: "number" }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check("user_two_factor_enabled_check", sql`${table.enabled} in (0, 1)`),
  ]
);

export const twoFactorRecoveryCodes = pgTable(
  "two_factor_recovery_codes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    codeHash: varchar("code_hash", { length: 64 }).notNull().unique(),
    usedAt: timestamp("used_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_recovery_codes_user").on(table.userId),
    index("idx_recovery_codes_hash").on(table.codeHash),
  ]
);

export type AuthChallengePurpose = "login" | "reauthentication";

export const authChallenges = pgTable(
  "auth_challenges",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull().unique(),
    purpose: varchar("purpose", { length: 30 })
      .$type<AuthChallengePurpose>()
      .notNull(),
    requestedPath: varchar("requested_path", { length: 512 }),
    attempts: integer("attempts").notNull().default(0),
    maxAttempts: integer("max_attempts").notNull().default(5),
    ipHash: varchar("ip_hash", { length: 64 }),
    userAgent: text("user_agent"),
    expiresAt: timestamp("expires_at", { mode: "date", withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_auth_challenges_token").on(table.tokenHash),
    index("idx_auth_challenges_user").on(table.userId),
    check(
      "auth_challenges_purpose_check",
      sql`${table.purpose} in ('login','reauthentication')`
    ),
    check(
      "auth_challenges_attempts_check",
      sql`${table.attempts} >= 0 and ${table.maxAttempts} between 1 and 10`
    ),
  ]
);
