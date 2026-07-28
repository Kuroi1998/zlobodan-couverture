import "server-only";
import { and, count, desc, eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  internalNotes,
  type InternalNoteEntityType,
} from "@/db/schema/notes";
import { users } from "@/db/schema/users";

/**
 * Notes internes : lecture et écriture.
 *
 * Ce module ne contrôle **aucune** permission : c'est le rôle du service
 * appelant. Il ne construit que des requêtes. En contrepartie, il n'est
 * importé que par `internal-note-service`, jamais par une page ni par une
 * route — la garantie « les notes ne fuient pas vers l'espace client » tient à
 * cette discipline d'appel, vérifiée par un test dédié.
 */

export interface InternalNote {
  id: string;
  content: string;
  authorEmail: string | null;
  createdAt: Date;
}

export async function listNotes(params: {
  entityType: InternalNoteEntityType;
  entityId: string;
  limit: number;
}): Promise<readonly InternalNote[]> {
  return db
    .select({
      id: internalNotes.id,
      content: internalNotes.content,
      authorEmail: users.email,
      createdAt: internalNotes.createdAt,
    })
    .from(internalNotes)
    .leftJoin(users, eq(internalNotes.authorUserId, users.id))
    .where(
      and(
        eq(internalNotes.entityType, params.entityType),
        eq(internalNotes.entityId, params.entityId),
        isNull(internalNotes.deletedAt)
      )
    )
    .orderBy(desc(internalNotes.createdAt))
    .limit(params.limit);
}

export async function countNotes(params: {
  entityType: InternalNoteEntityType;
  entityId: string;
}): Promise<number> {
  const rows = await db
    .select({ value: count() })
    .from(internalNotes)
    .where(
      and(
        eq(internalNotes.entityType, params.entityType),
        eq(internalNotes.entityId, params.entityId),
        isNull(internalNotes.deletedAt)
      )
    );
  return rows[0]?.value ?? 0;
}

export async function insertNote(params: {
  entityType: InternalNoteEntityType;
  entityId: string;
  content: string;
  authorUserId: string;
}): Promise<{ id: string; createdAt: Date }> {
  const rows = await db
    .insert(internalNotes)
    .values({
      entityType: params.entityType,
      entityId: params.entityId,
      content: params.content,
      authorUserId: params.authorUserId,
    })
    .returning({ id: internalNotes.id, createdAt: internalNotes.createdAt });

  const created = rows[0];
  if (!created) throw new Error("Insertion de la note non confirmée.");
  return created;
}
