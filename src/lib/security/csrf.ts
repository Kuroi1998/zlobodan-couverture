import type { NextRequest } from "next/server";

/**
 * Contrôle d'origine des requêtes mutantes.
 *
 * La version précédente ne vérifiait l'origine que si l'en-tête `Origin` était
 * présent : son absence suffisait à sauter entièrement le contrôle (audit H6).
 * Ici la politique est inversée — une requête mutante qui ne prouve pas son
 * origine est refusée.
 *
 * Conséquence assumée : les clients non-navigateurs (curl, scripts) doivent
 * envoyer un en-tête `Origin` correspondant au site. C'est un durcissement
 * volontaire, pas un effet de bord.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export type CsrfVerdict =
  | { allowed: true }
  | { allowed: false; reason: "cross-origin" | "no-origin-proof" | "unparseable-origin" };

function allowedHosts(request: NextRequest): Set<string> {
  const hosts = new Set<string>();
  const host = request.headers.get("host");
  if (host) hosts.add(host.toLowerCase());

  // Origine canonique explicite, utile derrière un proxy qui réécrit `Host`.
  const configured = process.env.APP_ORIGIN;
  if (configured) {
    try {
      hosts.add(new URL(configured).host.toLowerCase());
    } catch {
      // Variable mal formée : ignorée ici, signalée par la validation d'env.
    }
  }
  return hosts;
}

export function isMutating(request: NextRequest): boolean {
  return MUTATING_METHODS.has(request.method);
}

export function checkCsrf(request: NextRequest): CsrfVerdict {
  if (!isMutating(request)) return { allowed: true };

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  // `Sec-Fetch-Site` est posé par le navigateur et non modifiable par script.
  // Quand il est là, il fait autorité.
  if (fetchSite) {
    if (fetchSite === "same-origin" || fetchSite === "same-site") return { allowed: true };
    return { allowed: false, reason: "cross-origin" };
  }

  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      return { allowed: false, reason: "unparseable-origin" };
    }
    return allowedHosts(request).has(originHost)
      ? { allowed: true }
      : { allowed: false, reason: "cross-origin" };
  }

  // Ni `Sec-Fetch-Site` ni `Origin` : aucune preuve d'origine, donc refus.
  return { allowed: false, reason: "no-origin-proof" };
}
