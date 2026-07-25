/**
 * Content-Security-Policy à nonce par requête.
 *
 * Politique précédente (audit H1) : `script-src` autorisait `'unsafe-eval'` et
 * `https://unpkg.com`, `style-src` autorisait `'unsafe-inline'`, et aucun
 * rapport de violation n'était collecté. Cette combinaison rendait exploitable
 * l'injection HTML des routes PDF — il suffisait de pointer un `<script src>`
 * vers un domaine déjà autorisé.
 *
 * Compromis assumé et documenté : `style-src-attr 'unsafe-inline'` reste
 * autorisé. React écrit les props `style={{…}}` en attributs `style`, que ni
 * un nonce ni un hash ne peuvent couvrir. Un attribut de style n'exécute pas
 * de script ; le risque résiduel est l'exfiltration par sélecteurs CSS, très
 * inférieur à celui d'un `script-src` permissif. Voir SECURITY.md.
 */

/** Tuiles de la carte : seul domaine tiers encore nécessaire, en images uniquement. */
const MAP_TILES = "https://*.basemaps.cartocdn.com";

/** Turnstile : widget anti-automate, chargé en script et affiché en iframe. */
const TURNSTILE = "https://challenges.cloudflare.com";

export const CSP_REPORT_PATH = "/api/security/csp-report";

export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function buildCspHeader(nonce: string, isProduction: boolean): string {
  const directives: string[] = [
    "default-src 'self'",

    // En développement et production, Next.js et Tailwind injectent des styles <style> dynamiques.
    isProduction
      ? `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE}`
      : `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${TURNSTILE} https://unpkg.com`,

    isProduction
      ? `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`
      : `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com`,
    "style-src-attr 'unsafe-inline'",

    isProduction
      ? `img-src 'self' data: blob: ${MAP_TILES} https://*.cartocdn.com`
      : `img-src 'self' data: blob: ${MAP_TILES} https://*.cartocdn.com https://unpkg.com`,
    "font-src 'self' data: https://fonts.gstatic.com",
    `connect-src 'self' ${TURNSTILE} ${MAP_TILES}`,
    `frame-src ${TURNSTILE}`,

    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    // Empêche l'exfiltration par soumission de formulaire vers un tiers.
    "form-action 'self'",
    "manifest-src 'self'",
    "worker-src 'self' blob:",
  ];

  if (isProduction) {
    directives.push("upgrade-insecure-requests");
  }

  // Deux mécanismes : `report-uri` est déprécié mais encore le plus largement
  // implémenté, `report-to` est son successeur. On émet les deux.
  directives.push(`report-uri ${CSP_REPORT_PATH}`);
  directives.push("report-to csp-endpoint");

  return directives.join("; ");
}

/** En-tête compagnon désignant le collecteur nommé dans `report-to`. */
export function buildReportToHeader(): string {
  return JSON.stringify({
    group: "csp-endpoint",
    max_age: 10886400,
    endpoints: [{ url: CSP_REPORT_PATH }],
  });
}
