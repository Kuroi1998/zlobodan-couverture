import "server-only";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { userTwoFactor } from "@/db/schema/accounts";
import type { UpdateProfileInput } from "@/lib/validations/account-schemas";
import { logAuditEvent } from "./audit-service";

/**
 * Profil client : lecture et modification.
 *
 * La modification n'accepte **jamais** un objet utilisateur renvoyé par le
 * navigateur. Elle prend un objet déjà validé par `UpdateProfileSchema`, dont
 * la liste blanche ne contient que `phone`, et construit elle-même le `set`
 * champ par champ. Deux barrières indépendantes : le schéma refuse les clés
 * inconnues, et la requête n'écrit que des colonnes nommées en dur.
 */

export interface ClientProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  phone: string | null;
  emailVerifiedAt: Date | null;
  totpEnabled: boolean;
  createdAt: Date;
  activeSessions: number;
}

export async function getClientProfile(userId: string): Promise<ClientProfile | null> {
  const [rows, sessionRows] = await Promise.all([
    db
      .select({
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        phone: users.phone,
        emailVerifiedAt: users.emailVerifiedAt,
        totpEnabled: userTwoFactor.enabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .leftJoin(userTwoFactor, eq(userTwoFactor.userId, users.id))
      .where(and(eq(users.id, userId), isNull(users.deletedAt)))
      .limit(1),
    db
      .select({ value: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date())
        )
      ),
  ]);

  const account = rows[0];
  if (!account) return null;

  return {
    email: account.email,
    firstName: account.firstName,
    lastName: account.lastName,
    phone: account.phone,
    emailVerifiedAt: account.emailVerifiedAt,
    totpEnabled: account.totpEnabled === 1,
    createdAt: account.createdAt,
    activeSessions: sessionRows[0]?.value ?? 0,
  };
}

export type UpdateProfileResult =
  | {
      outcome: "updated";
      phone: string | null;
      firstName: string | null;
      lastName: string | null;
    }
  | { outcome: "not-found" };

export async function updateClientProfile(params: {
  userId: string;
  input: UpdateProfileInput;
  ipAddress?: string | null;
}): Promise<UpdateProfileResult> {
  // La chaîne vide vaut effacement : l'utilisateur doit pouvoir retirer un
  // numéro qu'il a fourni, sans passer par une demande RGPD.
  const nextPhone = params.input.phone === "" ? null : params.input.phone;

  const updated = await db
    .update(users)
    .set({
      phone: nextPhone,
      firstName: params.input.firstName,
      lastName: params.input.lastName,
      updatedAt: new Date(),
    })
    .where(and(eq(users.id, params.userId), isNull(users.deletedAt)))
    .returning({
      id: users.id,
      phone: users.phone,
      firstName: users.firstName,
      lastName: users.lastName,
    });

  const row = updated[0];
  if (!row) return { outcome: "not-found" };

  // Le numéro lui-même n'entre pas dans le journal : une piste d'audit n'a pas
  // à recopier la donnée personnelle qu'elle décrit. Seul le fait est tracé.
  await logAuditEvent({
    userId: params.userId,
    action: "profile.updated",
    targetTable: "users",
    targetId: params.userId,
    diff: {
      fields: [
        "phone",
        ...(params.input.firstName ? ["firstName"] : []),
        ...(params.input.lastName ? ["lastName"] : []),
      ],
      phoneRemoved: nextPhone === null,
    },
    ipAddress: params.ipAddress ?? undefined,
  });

  return {
    outcome: "updated",
    phone: row.phone,
    firstName: row.firstName,
    lastName: row.lastName,
  };
}
