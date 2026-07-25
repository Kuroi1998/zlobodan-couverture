/**
 * Garde anti-SSRF pour toute récupération d'URL côté serveur.
 *
 * Aucun appel de ce type n'existe aujourd'hui dans l'application. Le module est
 * écrit à l'avance parce que la SSRF apparaît toujours par une fonctionnalité
 * anodine ajoutée plus tard — import d'une photo « par URL », webhook, aperçu
 * de lien — et que la garde est systématiquement écrite après coup, donc mal.
 *
 * Principe : liste blanche de domaines. Une liste noire d'adresses privées
 * seule ne suffit pas, un nom de domaine public pouvant parfaitement résoudre
 * vers 127.0.0.1.
 */

export type SsrfVerdict =
  | { allowed: true; url: URL }
  | { allowed: false; reason: SsrfRejection };

export type SsrfRejection =
  | "unparseable"
  | "scheme-not-allowed"
  | "host-not-allowed"
  | "credentials-in-url"
  | "port-not-allowed"
  | "literal-private-address";

const ALLOWED_SCHEMES = new Set(["https:"]);
const ALLOWED_PORTS = new Set(["", "443"]);

/**
 * Domaines autorisés en sortie. Volontairement minimal : chaque ajout doit
 * être justifié, car il élargit la surface d'une éventuelle SSRF.
 */
const ALLOWED_HOSTS: readonly string[] = [
  "api.pwnedpasswords.com",
  "challenges.cloudflare.com",
];

/**
 * Plages réservées, bloquées explicitement même si un domaine autorisé y
 * résolvait. Inclut le point de métadonnées des principaux fournisseurs cloud
 * (169.254.169.254), cible classique pour récupérer des jetons d'instance.
 */
const PRIVATE_IPV4_PATTERNS: readonly RegExp[] = [
  /^127\./,
  /^10\./,
  /^192\.168\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^169\.254\./,
  /^0\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
];

const PRIVATE_IPV6_PREFIXES: readonly string[] = ["::1", "fc", "fd", "fe80", "::ffff:"];

export function isPrivateAddress(host: string): boolean {
  const normalized = host.toLowerCase().replace(/^\[|\]$/g, "");

  if (normalized === "localhost" || normalized.endsWith(".localhost")) return true;
  if (normalized === "metadata.google.internal") return true;

  if (PRIVATE_IPV4_PATTERNS.some((pattern) => pattern.test(normalized))) return true;
  if (PRIVATE_IPV6_PREFIXES.some((prefix) => normalized.startsWith(prefix))) return true;

  return false;
}

function isAllowedHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return ALLOWED_HOSTS.some(
    (allowed) => normalized === allowed || normalized.endsWith(`.${allowed}`)
  );
}

/**
 * Valide une URL avant toute requête sortante.
 *
 * Limite connue : la résolution DNS survient *après* ce contrôle, donc une
 * attaque par réassociation DNS (le nom résout d'abord vers une adresse
 * publique, puis vers une adresse privée) reste théoriquement possible. La
 * liste blanche de domaines la rend sans objet ici, puisque l'attaquant ne
 * contrôle pas les domaines autorisés. Ce point est rappelé dans SECURITY.md.
 */
export function assertSafeOutboundUrl(candidate: string): SsrfVerdict {
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return { allowed: false, reason: "unparseable" };
  }

  if (!ALLOWED_SCHEMES.has(url.protocol)) {
    return { allowed: false, reason: "scheme-not-allowed" };
  }
  // Des identifiants dans l'URL servent à contourner les filtres d'hôte
  // (`https://autorise.example@attaquant.example`).
  if (url.username || url.password) {
    return { allowed: false, reason: "credentials-in-url" };
  }
  if (!ALLOWED_PORTS.has(url.port)) {
    return { allowed: false, reason: "port-not-allowed" };
  }
  if (isPrivateAddress(url.hostname)) {
    return { allowed: false, reason: "literal-private-address" };
  }
  if (!isAllowedHost(url.hostname)) {
    return { allowed: false, reason: "host-not-allowed" };
  }

  return { allowed: true, url };
}

export const SSRF_ALLOWED_HOSTS = ALLOWED_HOSTS;
