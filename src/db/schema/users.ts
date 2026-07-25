import { pgTable, uuid, varchar, timestamp, integer, index } from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    role: varchar("role", { length: 20 }).notNull().default("client"), // 'client' | 'staff' | 'admin'
    phone: varchar("phone", { length: 30 }),
    emailVerifiedAt: timestamp("email_verified_at", { mode: "date", withTimezone: true }),
    lastLoginAt: timestamp("last_login_at", { mode: "date", withTimezone: true }),
    failedLoginAttempts: integer("failed_login_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until", { mode: "date", withTimezone: true }),
    totpSecret: varchar("totp_secret", { length: 255 }), // 2FA Secret
    totpEnabled: integer("totp_enabled").notNull().default(0),
    deletedAt: timestamp("deleted_at", { mode: "date", withTimezone: true }), // Soft delete
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("idx_users_email").on(table.email),
    index("idx_users_role").on(table.role),
  ]
);
