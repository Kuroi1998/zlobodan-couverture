import { z } from "zod";
import { normalizeText } from "@/lib/validations/normalize";

/**
 * Protection contre l'affectation en masse.
 *
 * Le motif dangereux est `db.update(users).set({ ...body })` : il suffit alors
 * d'ajouter `"role": "admin"` au corps de la requête pour s'attribuer le
 * back-office. Le même mécanisme permet de forcer `email_verified_at` et de
 * contourner la vérification d'adresse.
 *
 * La parade n'est pas de filtrer les champs interdits — une liste noire est
 * toujours en retard d'une colonne — mais de n'accepter **que** les champs
 * explicitement déclarés modifiables.
 */

/**
 * Champs qu'un utilisateur ne peut jamais modifier lui-même, quel que soit le
 * point d'entrée. Sert de garde-fou de relecture et de test.
 */
export const NEVER_USER_WRITABLE = [
  "id",
  "role",
  "email",
  "emailVerifiedAt",
  "email_verified_at",
  "passwordHash",
  "password_hash",
  "failedLoginAttempts",
  "lockedUntil",
  "totpSecret",
  "totpEnabled",
  "deletedAt",
  "createdAt",
  "created_at",
  "updatedAt",
] as const;

/**
 * Mise à jour de profil : liste blanche stricte.
 *
 * `email` en est délibérément absent — un changement d'adresse ne peut pas
 * être une simple mise à jour de champ, il exige un parcours de vérification
 * (voir `SECURITY.md`, dette identifiée).
 */
export const ProfileUpdateSchema = z
  .object({
    phone: z
      .string()
      .max(30)
      .regex(/^[+0-9 ().-]{8,30}$/, "Numéro de téléphone invalide.")
      .optional(),
    displayName: z.string().max(120).transform(normalizeText).optional(),
  })
  // `.strict()` fait échouer la validation si une clé non déclarée est
  // présente, au lieu de la retirer en silence : une tentative d'élévation
  // devient visible et journalisable.
  .strict();

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;

/**
 * Filtre générique par liste blanche, pour les cas où un schéma Zod n'est pas
 * adapté. Retourne uniquement les clés autorisées, et signale les clés
 * refusées afin que l'appelant puisse les journaliser.
 */
export function pickAllowedFields<T extends Record<string, unknown>>(
  input: Record<string, unknown>,
  allowed: readonly (keyof T & string)[]
): { value: Partial<T>; rejected: string[] } {
  const value: Record<string, unknown> = {};
  const rejected: string[] = [];

  for (const key of Object.keys(input)) {
    // Les clés de pollution de prototype ne sont jamais recopiées, même si
    // elles figuraient par erreur dans la liste blanche.
    if (key === "__proto__" || key === "constructor" || key === "prototype") {
      rejected.push(key);
      continue;
    }
    if ((allowed as readonly string[]).includes(key)) {
      value[key] = input[key];
    } else {
      rejected.push(key);
    }
  }

  return { value: value as Partial<T>, rejected };
}
