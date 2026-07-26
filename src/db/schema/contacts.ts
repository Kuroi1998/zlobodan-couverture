import {
  boolean,
  check,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { ContactMessageStatus } from "@/domain/request-workflow";
import { users } from "./users";

export const contactMessages = pgTable(
  "contact_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    reference: varchar("reference", { length: 32 }).notNull(),
    submissionKey: varchar("submission_key", { length: 128 }).notNull(),
    fullName: varchar("full_name", { length: 120 }).notNull(),
    email: varchar("email", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 30 }),
    subject: varchar("subject", { length: 50 }).notNull(),
    message: text("message").notNull(),
    status: varchar("status", { length: 30 })
      .$type<ContactMessageStatus>()
      .notNull()
      .default("new"),
    source: varchar("source", { length: 30 }).notNull().default("website"),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    internalNotes: text("internal_notes"),
    consentPrivacy: boolean("consent_privacy").notNull(),
    consentAt: timestamp("consent_at", { mode: "date", withTimezone: true }).notNull(),
    privacyPolicyVersion: varchar("privacy_policy_version", { length: 30 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
    readAt: timestamp("read_at", { mode: "date", withTimezone: true }),
    repliedAt: timestamp("replied_at", { mode: "date", withTimezone: true }),
    archivedAt: timestamp("archived_at", { mode: "date", withTimezone: true }),
  },
  (table) => [
    uniqueIndex("uq_contact_messages_reference").on(table.reference),
    uniqueIndex("uq_contact_messages_submission_key").on(table.submissionKey),
    index("idx_contact_messages_status").on(table.status),
    index("idx_contact_messages_created_at").on(table.createdAt),
    index("idx_contact_messages_email").on(table.email),
    index("idx_contact_messages_user_id").on(table.userId),
    check(
      "contact_messages_status_check",
      sql`${table.status} in ('new','read','in_progress','replied','closed','archived','spam')`
    ),
    check(
      "contact_messages_subject_check",
      sql`${table.subject} in ('general','emergency','follow_up','complaint','other')`
    ),
    check("contact_messages_consent_check", sql`${table.consentPrivacy} = true`),
  ]
);

export const contactStatusHistory = pgTable(
  "contact_status_history",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    contactMessageId: uuid("contact_message_id")
      .notNull()
      .references(() => contactMessages.id, { onDelete: "cascade" }),
    previousStatus: varchar("previous_status", { length: 30 }).$type<ContactMessageStatus>(),
    newStatus: varchar("new_status", { length: 30 }).$type<ContactMessageStatus>().notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: varchar("reason", { length: 500 }),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    index("idx_contact_status_history_message").on(table.contactMessageId),
    index("idx_contact_status_history_created_at").on(table.createdAt),
    check(
      "contact_status_history_previous_check",
      sql`${table.previousStatus} is null or ${table.previousStatus} in ('new','read','in_progress','replied','closed','archived','spam')`
    ),
    check(
      "contact_status_history_new_check",
      sql`${table.newStatus} in ('new','read','in_progress','replied','closed','archived','spam')`
    ),
  ]
);
