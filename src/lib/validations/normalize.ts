import { stripControlChars } from "./identifiers";

/**
 * Normalisation des identifiants avant comparaison.
 *
 * Sans elle, deux chaînes visuellement identiques peuvent produire deux
 * comptes distincts, ou au contraire permettre de se faire passer pour un
 * autre compte :
 *
 *  - `Jean@Example.be` et `jean@example.be` désignent la même boîte ;
 *  - « ﬁ » (ligature U+FB01) se décompose en « fi » sous NFKC — sans
 *    normalisation, `oﬃce@…` et `office@…` sont deux comptes différents pour
 *    la base, mais un seul pour le serveur de messagerie ;
 *  - les espaces invisibles (U+200B, U+FEFF) permettent de créer un doublon
 *    indétectable à l'œil.
 */

/** Espaces et marques de formatage invisibles, retirés des identifiants. */
const INVISIBLE_CODEPOINTS = new Set([
  0x00a0, // espace insécable
  0x200b, // espace sans chasse
  0x200c, // antiliant sans chasse
  0x200d, // liant sans chasse
  0x200e, // marque gauche-à-droite
  0x200f, // marque droite-à-gauche
  0x2028, // séparateur de ligne
  0x2029, // séparateur de paragraphe
  0x202a,
  0x202b,
  0x202c,
  0x202d,
  0x202e, // surcharges bidirectionnelles
  0xfeff, // indicateur d'ordre des octets
]);

export function stripInvisibleChars(value: string): string {
  let out = "";
  for (const ch of value) {
    const code = ch.codePointAt(0) ?? 0;
    if (!INVISIBLE_CODEPOINTS.has(code)) out += ch;
  }
  return out;
}

/**
 * Forme canonique d'une adresse email pour le stockage et la comparaison.
 *
 * NFKC est choisi plutôt que NFC : c'est lui qui replie les ligatures et les
 * variantes de compatibilité, donc lui qui ferme la création de doublons
 * visuellement identiques.
 *
 * La partie locale est mise en minuscules, ce qui est techniquement une
 * simplification — la RFC 5321 la déclare sensible à la casse — mais tous les
 * fournisseurs grand public la traitent ainsi, et l'alternative laisse créer
 * deux comptes pour une seule boîte.
 */
export function normalizeEmail(raw: string): string {
  return stripInvisibleChars(stripControlChars(raw))
    .normalize("NFKC")
    .trim()
    .toLowerCase();
}

/** Normalisation d'un texte libre destiné à l'affichage ou au stockage. */
export function normalizeText(raw: string): string {
  return stripInvisibleChars(stripControlChars(raw)).normalize("NFKC").trim();
}

/**
 * Forme de stockage compacte d'un numéro : un éventuel `+` initial et les
 * chiffres uniquement. Les séparateurs restent une préoccupation d'affichage.
 */
export function normalizePhone(raw: string): string {
  const cleaned = normalizeText(raw);
  const hasInternationalPrefix = cleaned.startsWith("+");
  const digits = cleaned.replace(/\D/g, "");
  return `${hasInternationalPrefix ? "+" : ""}${digits}`;
}

/**
 * Neutralisation des retours à la ligne dans une valeur journalisée.
 *
 * Sans elle, une valeur contenant `\n` permet de fabriquer de fausses lignes
 * de journal et donc de falsifier une piste d'audit — ou de faire disparaître
 * une trace réelle dans le bruit.
 */
export function sanitizeForLog(value: unknown): string {
  const asString = typeof value === "string" ? value : String(value ?? "");
  const flattened = stripControlChars(asString.replace(/[\r\n\t]+/g, " "));
  return flattened.length > 500 ? `${flattened.slice(0, 500)}…` : flattened;
}
