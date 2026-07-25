import type { NextRequest, NextResponse } from "next/server";

/**
 * Politique de cache.
 *
 * Risque propre à cette architecture : une page authentifiée mise en cache par
 * le CDN est ensuite servie au visiteur suivant. `force-dynamic` empêche Next
 * de *prérendre* la page, mais n'émet aucun en-tête de cache — un CDN réglé en
 * « Cache Everything » la mettrait donc en cache malgré tout.
 *
 * On ne se repose pas sur la configuration CDN pour cela : l'origine déclare
 * elle-même que ces réponses ne sont pas cachables. La règle CDN du runbook
 * reste une seconde barrière, pas la première.
 */

/** Préfixes dont aucune réponse ne doit jamais être conservée. */
const PRIVATE_PREFIXES = ["/mon-compte", "/admin", "/api"] as const;

/**
 * `no-store` interdit toute écriture, y compris dans le cache disque du
 * navigateur : c'est ce qui empêche la restitution de la page par le bouton
 * « retour » après déconnexion sur un poste partagé.
 */
const PRIVATE_CACHE_VALUE = "private, no-store, no-cache, must-revalidate, max-age=0";

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

/**
 * En-têtes entrants susceptibles d'influencer la réponse sans faire partie de
 * la clé de cache. Un attaquant qui empoisonne le cache avec l'un d'eux fait
 * servir sa charge à tous les visiteurs suivants.
 *
 * Ils sont retirés de la requête avant qu'elle n'atteigne l'application, ce qui
 * garantit qu'aucun code — présent ou futur — ne peut les lire.
 */
export const UNSAFE_INBOUND_HEADERS = [
  "x-forwarded-host",
  "x-original-url",
  "x-rewrite-url",
  "x-http-method-override",
  "x-forwarded-scheme",
  "x-forwarded-server",
  "x-host",
  "x-original-host",
  // En-têtes d'identité de développement : aucune route ne doit s'y fier, et
  // leur simple présence dans la requête est un signal.
  "x-admin",
  "x-user-id",
  "x-role",
] as const;

export function stripUnsafeInboundHeaders(headers: Headers): string[] {
  const removed: string[] = [];
  for (const name of UNSAFE_INBOUND_HEADERS) {
    if (headers.has(name)) {
      headers.delete(name);
      removed.push(name);
    }
  }
  return removed;
}

/**
 * Applique la politique de cache adaptée au chemin.
 *
 * `Vary: Cookie` est posé même sur les réponses non cachables : un cache
 * intermédiaire mal configuré qui ignorerait `no-store` doit au moins être
 * contraint de distinguer les réponses par cookie.
 */
export function applyCachePolicy(
  request: NextRequest,
  response: NextResponse
): NextResponse {
  if (!isPrivatePath(request.nextUrl.pathname)) return response;

  response.headers.set("Cache-Control", PRIVATE_CACHE_VALUE);
  response.headers.set("CDN-Cache-Control", PRIVATE_CACHE_VALUE);
  // En-tête propriétaire Cloudflare : il l'emporte sur les règles de page.
  response.headers.set("Cloudflare-CDN-Cache-Control", PRIVATE_CACHE_VALUE);
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Vary", "Cookie, Authorization");

  return response;
}

export const CACHE_POLICY = { PRIVATE_PREFIXES, PRIVATE_CACHE_VALUE };
