/**
 * Éléments partagés par les routes de consultation et de téléchargement.
 *
 * Les deux servent le même octet sous deux dispositions différentes. Mettre
 * les en-têtes en commun garantit qu'une correction de sécurité appliquée à
 * l'une profite à l'autre — l'oubli inverse est le scénario classique où la
 * prévisualisation reste ouverte alors que le téléchargement a été fermé.
 */

export type VersionSelector = number | undefined | "invalid";

/**
 * Lit le paramètre `version` de la requête.
 *
 * Un numéro de version n'est **pas** un droit d'accès : il est résolu à
 * l'intérieur du document déjà autorisé. La validation ici ne sert qu'à
 * refuser ce qui n'est pas un entier positif raisonnable, avant d'atteindre la
 * base.
 */
export function parseVersionParam(raw: string | null): VersionSelector {
  if (raw === null || raw.trim().length === 0) return undefined;

  if (!/^[0-9]{1,6}$/.test(raw)) return "invalid";

  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 ? value : "invalid";
}

/**
 * En-têtes de service d'un PDF.
 *
 * - `nosniff` empêche le navigateur de réinterpréter le type déclaré.
 * - `private, no-store` tient les documents confidentiels hors de tout cache
 *   partagé, mandataire ou CDN, et hors du cache disque après déconnexion.
 * - La politique de sécurité de contenu neutralise le document servi :
 *   `default-src 'none'` et `sandbox` coupent tout script ou ressource
 *   externe qu'un PDF pourrait embarquer.
 * - `no-referrer` évite que l'URL du document parte vers un tiers.
 *
 * Le nom de fichier est émis sous deux formes : une forme repliée sur l'ASCII
 * pour les clients anciens, et `filename*` en UTF-8 pour les autres. La forme
 * ASCII est filtrée caractère par caractère, ce qui ferme l'injection d'en-tête
 * par guillemet ou retour à la ligne.
 */
export function pdfResponseHeaders(
  fileName: string,
  byteLength: number,
  disposition: "attachment" | "inline"
): Record<string, string> {
  const asciiName = fileName.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 100);
  const encodedName = encodeURIComponent(fileName);

  return {
    "Content-Type": "application/pdf",
    "Content-Length": String(byteLength),
    "Content-Disposition": `${disposition}; filename="${asciiName}"; filename*=UTF-8''${encodedName}`,
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "private, no-store, max-age=0, must-revalidate",
    "Referrer-Policy": "no-referrer",
    "Content-Security-Policy": "default-src 'none'; object-src 'none'; sandbox",
  };
}
