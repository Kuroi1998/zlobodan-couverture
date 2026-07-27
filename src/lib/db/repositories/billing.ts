import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quotes } from "@/db/schema/quotes";

/**
 * Accès aux documents commerciaux.
 *
 * Toutes les lectures sont paramétrées par Drizzle — aucune interpolation de
 * chaîne SQL. Les fonctions retournent systématiquement le propriétaire de la
 * ressource pour que l'appelant puisse trancher l'appartenance : une requête
 * qui ne rapporte pas son `ownerId` invite à oublier le contrôle.
 *
 * `findQuoteForPdf` et `findInvoiceForPdf` ont été retirées avec le générateur
 * qu'elles alimentaient. Celui-ci produisait du HTML servi en `text/html` sous
 * un nom de fichier `.html`, et non un PDF ; les deux routes qui l'exposaient
 * étaient par ailleurs inatteignables, `quotes` et `invoices` n'ayant aucun
 * chemin d'écriture dans l'application. La génération documentaire réelle vit
 * désormais dans `lib/documents`.
 */

export interface QuoteDecisionTarget {
  id: string;
  number: string;
  ownerId: string | null;
  status: string;
  validUntil: Date;
}

export async function findQuoteForDecision(quoteId: string): Promise<QuoteDecisionTarget | null> {
  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      ownerId: quotes.userId,
      status: quotes.status,
      validUntil: quotes.validUntil,
    })
    .from(quotes)
    .where(eq(quotes.id, quoteId))
    .limit(1);

  return rows[0] ?? null;
}
