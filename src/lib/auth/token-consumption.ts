import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { emailVerificationTokens, passwordResetTokens } from "@/db/schema/tokens";
import { hashToken } from "./session";

/**
 * Consommation à usage unique des jetons.
 *
 * Le piège classique : lire le jeton, vérifier que `used_at` est nul, puis le
 * marquer dans une seconde requête. Entre les deux, une requête concurrente
 * passe le même contrôle — et deux réinitialisations de mot de passe
 * aboutissent avec le même lien.
 *
 * La correction consiste à faire du marquage **lui-même** le test :
 * `UPDATE … WHERE used_at IS NULL … RETURNING`. PostgreSQL sérialise les
 * écritures sur une même ligne, donc exactement une des deux requêtes obtient
 * une ligne en retour ; l'autre reçoit un ensemble vide et échoue proprement.
 *
 * Aucune lecture préalable n'est nécessaire, et il n'y a donc aucune fenêtre
 * entre la vérification et l'action.
 */

export type TokenPurpose = "email-verification" | "password-reset";

export interface ConsumedToken {
  userId: string;
}

export type ConsumeResult =
  | { ok: true; token: ConsumedToken }
  | { ok: false; reason: "invalid-or-already-used" };

/**
 * Le jeton en clair n'est jamais stocké : on compare son empreinte SHA-256.
 * La comparaison est faite par PostgreSQL sur une colonne indexée et unique,
 * donc en temps constant du point de vue de l'attaquant — il n'obtient aucune
 * information partielle sur l'empreinte.
 */
export async function consumeToken(
  purpose: TokenPurpose,
  rawToken: string
): Promise<ConsumeResult> {
  const table = purpose === "password-reset" ? passwordResetTokens : emailVerificationTokens;
  const tokenHash = hashToken(rawToken);
  const now = new Date();

  const updated = await db
    .update(table)
    .set({ usedAt: now })
    .where(
      and(
        eq(table.tokenHash, tokenHash),
        // Ces deux conditions font partie de l'UPDATE, pas d'un SELECT
        // préalable : c'est ce qui rend la consommation atomique.
        isNull(table.usedAt),
        gt(table.expiresAt, now)
      )
    )
    .returning({ userId: table.userId });

  const row = updated[0];
  if (!row) return { ok: false, reason: "invalid-or-already-used" };

  return { ok: true, token: { userId: row.userId } };
}

/**
 * Invalide tous les jetons en cours d'un compte.
 *
 * À appeler après un changement de mot de passe réussi : les liens de
 * réinitialisation encore en circulation, y compris ceux demandés par un
 * attaquant, doivent cesser d'être exploitables.
 */
export async function invalidateTokensForUser(
  purpose: TokenPurpose,
  userId: string
): Promise<void> {
  const table = purpose === "password-reset" ? passwordResetTokens : emailVerificationTokens;
  await db
    .update(table)
    .set({ usedAt: new Date() })
    .where(and(eq(table.userId, userId), isNull(table.usedAt)));
}
