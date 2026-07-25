import { z } from "zod";

/**
 * Validation des identifiants de route.
 *
 * Règle : un identifiant mal formé est rejeté *avant* d'atteindre la couche
 * base. Aucune requête n'est émise pour une valeur qui ne peut de toute façon
 * pas exister. Cela ferme à la fois la surface d'injection et le vecteur de
 * déni de service par requêtes inutiles.
 */

export const UuidSchema = z.string().uuid("Identifiant invalide.");

/**
 * Numéros de documents belges : DEV-2026-0001, FACT-2026-0012, AV-2026-0003.
 *
 * Ces numéros restent *affichables* mais ne doivent jamais servir de clé
 * d'accès : ils sont séquentiels, donc énumérables. Les routes résolvent
 * toujours un UUID ; ce schéma ne sert qu'aux usages d'affichage et de
 * recherche interne au back-office.
 */
export const DocumentNumberSchema = z
  .string()
  .regex(/^(DEV|FACT|AV)-\d{4}-\d{4}$/, "Numéro de document invalide.");

export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Pagination bornée.
 *
 * Une valeur excessive est *ramenée* au plafond plutôt que rejetée : refuser
 * offrirait à un client la possibilité de provoquer une erreur, et pousserait
 * l'appelant à traiter le cas. Le plafond, lui, n'est jamais négociable — un
 * `limit` fourni par le client ne peut pas dépasser 100.
 */
export const PaginationSchema = z.object({
  page: z.coerce.number().int().catch(1).pipe(z.number().min(1).max(1000).catch(1)),
  limit: z.coerce
    .number()
    .int()
    .catch(DEFAULT_PAGE_SIZE)
    .transform((n) => Math.min(Math.max(n, 1), MAX_PAGE_SIZE))
    .pipe(z.number().min(1).max(MAX_PAGE_SIZE)),
});

export type Pagination = z.infer<typeof PaginationSchema>;

const SPACE_CODE = 32;
const DEL_CODE = 127;

/**
 * Retire les caractères de contrôle ASCII.
 *
 * Écrit par comparaison de points de code plutôt qu'avec une classe de
 * caractères : le littéral de regex correspondant contiendrait des octets de
 * contrôle réels dans le fichier source, invisibles en relecture.
 */
export function stripControlChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (code < SPACE_CODE || code === DEL_CODE) continue;
    out += ch;
  }
  return out;
}

/**
 * Recherche plein texte : bornée en longueur et nettoyée de ses caractères de
 * contrôle. Le contenu reste passé en paramètre lié — ce nettoyage borne le
 * coût de la requête et empêche l'injection de fausses lignes de journal, il
 * ne remplace jamais le paramétrage.
 */
export const SearchTermSchema = z
  .string()
  .trim()
  .max(120, "Recherche trop longue.")
  .transform(stripControlChars);

export interface ParsedParam<T> {
  ok: boolean;
  value: T | null;
}

/** Helper de route : parse sans lever, pour renvoyer un 404 uniforme. */
export function parseUuidParam(raw: string | undefined): ParsedParam<string> {
  const result = UuidSchema.safeParse(raw);
  return result.success ? { ok: true, value: result.data } : { ok: false, value: null };
}
