import { sql } from "drizzle-orm";
import { db } from "@/db/client";

/**
 * POINT D'EXCEPTION UNIQUE POUR LE SQL BRUT.
 *
 * Ce fichier est le seul du dépôt où la règle ESLint interdisant `db.execute`
 * et `sql.raw` est levée (voir `.eslintrc.json`, section `overrides`).
 *
 * -------------------------------------------------------------------------
 * RÈGLES D'AJOUT — à respecter sans exception
 * -------------------------------------------------------------------------
 * 1. Toute fonction ajoutée ici doit être précédée d'un commentaire indiquant
 *    POURQUOI le query builder Drizzle ne suffit pas.
 * 2. Aucune valeur reçue d'un utilisateur ne peut être interpolée dans la
 *    chaîne SQL. Les valeurs passent en paramètres liés.
 * 3. Un identifiant dynamique (nom de table, de colonne, de séquence) provient
 *    obligatoirement d'une liste blanche constante définie dans le code —
 *    jamais de la valeur reçue.
 * 4. Toute fonction exportée ici doit être couverte par un test.
 */

/**
 * EXCEPTION 1 — `nextval()` sur une séquence PostgreSQL.
 *
 * Pourquoi Drizzle ne suffit pas : le query builder ne sait pas exprimer
 * `nextval()`, qui n'est ni une lecture de table ni une écriture. Or c'est le
 * seul mécanisme dont l'incrément est atomique **sans verrou explicite** — un
 * `SELECT MAX(numero)+1`, même sous `FOR UPDATE`, sérialise toutes les
 * facturations et reste sujet aux interblocages.
 *
 * Sûreté : le nom de séquence n'est jamais reçu de l'extérieur. Il provient de
 * la table constante `NUMBERING_SEQUENCES` (`lib/db/numbering.ts`) et est
 * validé par l'appelant avant d'arriver ici. Il est en outre passé en
 * **paramètre lié** puis converti par `::regclass`, et non concaténé : une
 * valeur inattendue provoque une erreur PostgreSQL, pas une injection.
 */
export async function selectNextSequenceValue(sequenceName: string): Promise<number> {
  const rows = await db.execute<{ nextval: string | number }>(
    sql`SELECT nextval(${sequenceName}::regclass) AS nextval`
  );

  const list = rows as unknown as { nextval: string | number }[];
  const value = Number(list?.[0]?.nextval);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error("La séquence de numérotation n'a pas retourné de valeur exploitable.");
  }
  return value;
}

export const RAW_QUERY_POLICY = {
  exceptionsCount: 1,
  reviewedAt: "2026-07-25",
} as const;
