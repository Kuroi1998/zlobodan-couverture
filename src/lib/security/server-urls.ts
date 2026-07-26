import "server-only";
import { getAppOrigin } from "@/config/env";

/**
 * Construction d'URL absolues côté serveur.
 *
 * Séparé de `urls.ts` : ces fonctions lisent l'origine canonique
 * (`APP_ORIGIN`) via la configuration serveur, alors que `urls.ts` — dont
 * `safeReturnPath` est importé par un composant client — doit rester
 * exempt de toute variable d'environnement serveur. La marque `server-only`
 * garantit que ce module ne peut pas rejoindre le bundle navigateur.
 *
 * L'origine ne dérive jamais de l'en-tête `Host` reçu : un lien de
 * réinitialisation construit depuis `Host` permettrait à un attaquant de se
 * faire envoyer le jeton d'un tiers en falsifiant cet en-tête.
 */

/** URL absolue pour un email transactionnel ou une redirection externe. */
export function buildAbsoluteUrl(path: string, params?: Record<string, string>): string {
  const url = new URL(path.startsWith("/") ? path : `/${path}`, getAppOrigin());
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

/**
 * Origines autorisées en cross-origin : uniquement l'origine canonique du
 * site. Jamais un reflet de l'en-tête `Origin` reçu — refléter revient à
 * autoriser tout le monde en ayant l'air de contrôler.
 */
export function isAllowedCorsOrigin(origin: string | null): boolean {
  if (!origin) return false;
  try {
    return new URL(origin).origin === getAppOrigin();
  } catch {
    return false;
  }
}
