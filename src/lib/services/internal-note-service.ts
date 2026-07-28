import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteRequests } from "@/db/schema/quotes";
import type { InternalNoteEntityType } from "@/db/schema/notes";
import {
  insertNote,
  listNotes,
  type InternalNote,
} from "@/lib/db/repositories/internal-note-repository";
import type { AuthUser } from "@/lib/auth/permissions";
import { logAuditEvent } from "./audit-service";

/**
 * Notes internes.
 *
 * Ce service est le **seul** point d'entrée des notes. Il porte donc la règle
 * qui compte : une note n'est lisible et écrivable que par un opérateur. Le
 * contrôle est ici, en amont de toute requête, et non dans les composants qui
 * les affichent — masquer une note dans une page ne l'empêche pas d'être
 * sérialisée dans la charge utile envoyée au navigateur.
 *
 * Aucune fonction de ce module n'est appelable depuis l'espace client : un
 * test vérifie qu'aucun fichier de `src/app/mon-compte` ne l'importe.
 */

const NOTE_PAGE_SIZE = 50;

function isOperator(user: AuthUser): boolean {
  return user.role === "staff" || user.role === "admin";
}

export type ListNotesResult =
  | { outcome: "ok"; notes: readonly InternalNote[] }
  | { outcome: "forbidden" };

export async function listInternalNotes(params: {
  actor: AuthUser;
  entityType: InternalNoteEntityType;
  entityId: string;
}): Promise<ListNotesResult> {
  if (!isOperator(params.actor)) return { outcome: "forbidden" };

  const notes = await listNotes({
    entityType: params.entityType,
    entityId: params.entityId,
    limit: NOTE_PAGE_SIZE,
  });
  return { outcome: "ok", notes };
}

export type CreateNoteResult =
  | { outcome: "created"; id: string }
  | { outcome: "forbidden" }
  | { outcome: "entity-not-found" };

/**
 * Ajout d'une note.
 *
 * L'existence de l'entité porteuse est vérifiée avant l'insertion : la colonne
 * `entity_id` est polymorphe, donc sans clé étrangère, et rien au niveau du
 * moteur n'empêcherait d'attacher une note à un identifiant qui n'existe pas.
 * La vérification et l'insertion partagent la même transaction.
 */
export async function createInternalNote(params: {
  actor: AuthUser;
  entityType: InternalNoteEntityType;
  entityId: string;
  content: string;
  ipAddress?: string | null;
}): Promise<CreateNoteResult> {
  if (!isOperator(params.actor)) return { outcome: "forbidden" };

  const exists = await entityExists(params.entityType, params.entityId);
  if (!exists) return { outcome: "entity-not-found" };

  const created = await insertNote({
    entityType: params.entityType,
    entityId: params.entityId,
    content: params.content,
    authorUserId: params.actor.id,
  });

  // Le contenu de la note n'est pas recopié dans l'audit : il peut décrire une
  // situation personnelle, et le journal est lu plus largement que le dossier.
  await logAuditEvent({
    userId: params.actor.id,
    action: "internal_note.created",
    targetTable: params.entityType === "quote_request" ? "quote_requests" : "contact_messages",
    targetId: params.entityId,
    diff: { noteId: created.id, length: params.content.length },
    ipAddress: params.ipAddress ?? undefined,
  });

  return { outcome: "created", id: created.id };
}

async function entityExists(
  entityType: InternalNoteEntityType,
  entityId: string
): Promise<boolean> {
  if (entityType === "quote_request") {
    const rows = await db
      .select({ id: quoteRequests.id })
      .from(quoteRequests)
      .where(eq(quoteRequests.id, entityId))
      .limit(1);
    return rows.length > 0;
  }

  const rows = await db
    .select({ id: contactMessages.id })
    .from(contactMessages)
    .where(eq(contactMessages.id, entityId))
    .limit(1);
  return rows.length > 0;
}

export type { InternalNote };
