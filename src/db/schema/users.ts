import {
  check,
  index,
  integer,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { UserRole } from "@/lib/auth/permissions";

export type UserStatus =
  | "pending_verification"
  | "active"
  | "locked"
  | "disabled"
  | "deleted";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    publicId: uuid("public_id").notNull().defaultRandom().unique(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    normalizedEmail: varchar("normalized_email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    firstName: varchar("first_name", { length: 100 }),
    lastName: varchar("last_name", { length: 100 }),
    role: varchar("role", { length: 20 }).$type<UserRole>().notNull().default("client"),
    status: varchar("status", { length: 30 })
      .$type<UserStatus>()
      .notNull()
      .default("pending_verification"),
    phone: varchar("phone", { length: 30 }),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "date", withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", {
      mode: "date",
      withTimezone: true,
    }),
    lastLoginAt: timestamp("last_login_at", { mode: "date", withTimezone: true }),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { mode: "date", withTimezone: true }),
    disabledAt: timestamp("disabled_at", { mode: "date", withTimezone: true }),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_normalized_email").on(table.normalizedEmail),
    index("idx_users_role").on(table.role),
    index("idx_users_status").on(table.status),
    check("users_role_check", sql`${table.role} in ('client','staff','admin')`),
    check(
      "users_status_check",
      sql`${table.status} in ('pending_verification','active','locked','disabled','deleted')`
    ),
  ]
);
