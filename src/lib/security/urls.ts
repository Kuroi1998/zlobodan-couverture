/**
 * Validation de chemins de retour — fonction **pure, sans variable
 * d'environnement**.
 *
 * Ce module est importé par un composant client (`LoginForm`) : il ne doit
 * lire aucune configuration serveur, sous peine de la tirer dans le bundle
 * navigateur. Les constructions d'URL absolues, qui ont besoin de l'origine
 * canonique, vivent dans `server-urls.ts` (marqué `server-only`).
 *
 * **Open redirect.** Un paramètre de retour après connexion accepté sans
 * contrôle transforme le domaine légitime en tremplin de hameçonnage :
 * l'utilisateur voit bien `zlobodan-couverture.be` avant d'être expédié
 * ailleurs.
 */

/**
 * Valide un chemin de retour après connexion.
 *
 * N'accepte qu'un chemin relatif à ce site. Sont refusés : les URL absolues,
 * les URL protocol-relative (`//attaquant.example`, que le navigateur traite
 * comme absolue), les antislashs (que certains navigateurs normalisent en
 * `/`), les schémas actifs et les séquences encodées qui reconstituent l'un
 * de ces cas après décodage.
 */
export function safeReturnPath(candidate: unknown, fallback = "/mon-compte"): string {
  if (typeof candidate !== "string" || candidate.length === 0) return fallback;
  if (candidate.length > 512) return fallback;

  // Un décodage préalable évite qu'un `%2F%2Fattaquant.example` passe le
  // contrôle puis soit décodé par le navigateur.
  let decoded = candidate;
  try {
    decoded = decodeURIComponent(candidate);
  } catch {
    return fallback;
  }

  const normalized = decoded.trim();

  if (!normalized.startsWith("/")) return fallback;
  if (normalized.startsWith("//")) return fallback;
  if (normalized.includes("\\")) return fallback;
  if (normalized.includes("://")) return fallback;
  // Caractères de contrôle, dont les retours à la ligne d'un « response splitting ».
  if (/[\u0000-\u001f\u007f]/.test(normalized)) return fallback;
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(normalized)) return fallback;

  return normalized;
}
