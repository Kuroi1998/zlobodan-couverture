import { pgTable, uuid, varchar, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { users } from "./users";
import { projects } from "./projects";

export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, { onDelete: "set null" }),
    type: varchar("type", { length: 50 }).notNull(), // 'photo_before' | 'photo_after' | 'decennale' | 'pv_reception' | 'invoice_pdf' | 'quote_pdf'
    storagePath: text("storage_path").notNull(),
    mimeType: varchar("mime_type", { length: 100 }).notNull(),
    size: integer("size").notNull(),
    checksum: varchar("checksum", { length: 64 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date", withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    ownerIdIdx: index("idx_documents_owner_id").on(table.ownerId),
    projectIdIdx: index("idx_documents_project_id").on(table.projectId),
    typeIdx: index("idx_documents_type").on(table.type),
  })
);
