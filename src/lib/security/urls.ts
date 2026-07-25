/**
 * Construction d'URL sûres.
 *
 * Deux failles distinctes, même racine — faire confiance à une valeur reçue :
 *
 * 1. **Injection d'en-tête Host.** Un lien de réinitialisation construit
 *    depuis `request.headers.host` permet à un attaquant de demander un reset
 *    pour l'adresse d'un tiers en falsifiant `Host`, puis de recevoir le lien
 *    contenant le jeton de la victime. L'URL de base vient donc exclusivement
 *    d'une variable d'environnement.
 *
 * 2. **Open redirect.** Un paramètre de retour après connexion accepté sans
 *    contrôle transforme le domaine légitime en tremplin de hameçonnage :
 *    l'utilisateur voit bien `zlobodan-couverture.be` avant d'être expédié
 *    ailleurs.
 */

const DEFAULT_DEV_ORIGIN = "http://localhost:3000";

/**
 * Origine canonique. Jamais dérivée d'un en-tête de requête.
 * En production, `lib/security/env.ts` impose déjà que `APP_ORIGIN` soit posée.
 */
export function getBaseUrl(): string {
  const configured = process.env.APP_ORIGIN;
  if (configured) return configured.replace(/\/+$/, "");

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "[securite] APP_ORIGIN est obligatoire en production : les liens transactionnels " +
        "ne doivent jamais être construits depuis l'en-tête Host reçu."
    );
  }
  return DEFAULT_DEV_ORIGIN;
}

/** Construit une URL absolue destinée à un email ou une redirection externe. */
export function buildAbsoluteUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, getBaseUrl());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

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

/**
 * Origines autorisées à faire des requêtes cross-origin.
 *
 * Liste blanche stricte, jamais un reflet de l'en-tête `Origin` reçu : refléter
 * l'origine revient à autoriser tout le monde tout en ayant l'air d'un
 * contrôle. `*` avec `credentials: true` est de toute façon refusé par les
 * navigateurs, mais la combinaison n'est pas produite ici.
 */
export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === getBaseUrl();
  } catch {
    return false;
  }
}
