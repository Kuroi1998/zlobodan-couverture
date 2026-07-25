import crypto from "crypto";

/**
 * Comparaisons insensibles au temps.
 *
 * `===` sur une chaîne s'arrête au premier octet différent. La durée de la
 * comparaison révèle donc combien de caractères de tête sont corrects, ce qui
 * permet de reconstituer un secret octet par octet quand l'attaquant peut
 * répéter la mesure.
 *
 * À utiliser pour tout secret comparé côté serveur : empreintes de jetons de
 * session, jetons de réinitialisation, signatures de webhook, clés d'API.
 * Inutile — et contre-productif en lisibilité — pour comparer des valeurs
 * publiques comme un statut ou un identifiant.
 */

/**
 * Compare deux chaînes en temps constant.
 *
 * Les deux valeurs sont d'abord hachées : `timingSafeEqual` exige des tampons
 * de longueur identique et lèverait autrement, ce qui recréerait justement une
 * fuite — sur la longueur cette fois.
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  const bufA = crypto.createHash("sha256").update(a, "utf8").digest();
  const bufB = crypto.createHash("sha256").update(b, "utf8").digest();
  return crypto.timingSafeEqual(bufA, bufB);
}

/** Une empreinte hexadécimale : longueur paire, chiffres hexadécimaux uniquement. */
const HEX_PATTERN = /^(?:[0-9a-fA-F]{2})+$/;

/**
 * Variante pour deux empreintes hexadécimales.
 *
 * La validation de forme n'est pas cosmétique : `Buffer.from("zzzz", "hex")`
 * ne lève pas, il retourne un **tampon vide** en ignorant les caractères
 * invalides. Sans ce contrôle, comparer deux valeurs non hexadécimales
 * revenait à comparer deux tampons vides — et `timingSafeEqual` répondait
 * `true`. Défaut détecté par les tests.
 */
export function timingSafeEqualHex(a: string, b: string): boolean {
  const wellFormed = HEX_PATTERN.test(a) && HEX_PATTERN.test(b) && a.length === b.length;

  if (!wellFormed) {
    // Comparaison factice pour ne pas retourner instantanément : la durée ne
    // doit pas distinguer « mal formé » de « différent ».
    const filler = Buffer.alloc(32);
    crypto.timingSafeEqual(filler, filler);
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a, "hex"), Buffer.from(b, "hex"));
}
