/**
 * Content-Security-Policy — source de vérité unique.
 *
 * ---------------------------------------------------------------------------
 * DÉFAUT CORRIGÉ : la politique précédente cassait tout le JavaScript du site
 * ---------------------------------------------------------------------------
 * Elle émettait `script-src 'self' 'nonce-…' 'strict-dynamic'` sur *toutes* les
 * réponses. Or `'strict-dynamic'` annule la source `'self'` : seuls les scripts
 * portant le nonce sont alors exécutés.
 *
 * Le nonce, lui, ne peut pas exister dans une page **prérendue au build** : le
 * HTML est figé avant qu'une requête n'existe. Mesuré sur un serveur réel —
 * une page rendue dynamiquement reçoit 18 attributs `nonce`, une page statique
 * en reçoit zéro. Conséquence : sur toutes les pages publiques, aucun bundle
 * Next ne s'exécutait (`webpackChunk_N_E` et `__next_f` indéfinis), donc pas
 * d'hydratation, pas de carte, pas de formulaire de devis, pas de menu mobile.
 *
 * ---------------------------------------------------------------------------
 * STRATÉGIE RETENUE : deux politiques, selon le mode de rendu
 * ---------------------------------------------------------------------------
 * - `"nonce"` — pages rendues à la requête (espace client, back-office, API).
 *   Politique stricte : nonce + `'strict-dynamic'`, aucun script inline libre.
 *   C'est là que vivent les sessions et les données clientes.
 *
 * - `"static"` — pages publiques prérendues. Le nonce y est structurellement
 *   impossible ; `script-src` retombe sur `'self' 'unsafe-inline'`.
 *
 * Ce que cela laisse exposé, sans détour : sur les pages publiques, un script
 * inline injecté s'exécuterait. Le risque est borné par le fait que ces pages
 * ne rendent que des données du dépôt, qu'aucune saisie utilisateur n'y est
 * réinjectée côté serveur, et qu'aucune session n'y est accessible. Le jour où
 * une page publique affichera du contenu soumis par un visiteur, elle devra
 * passer en rendu dynamique pour retrouver le nonce.
 *
 * L'alternative — forcer le rendu dynamique partout — supprimerait
 * `'unsafe-inline'` mais aussi la mise en cache CDN des pages publiques, qui
 * est la première ligne d'absorption de charge décrite au runbook.
 */

export type CspEnvironment = "development" | "production";

/** Mode de rendu de la réponse, qui détermine si un nonce est exploitable. */
export type CspRenderStrategy = "nonce" | "static";

export type BuildCspOptions = Readonly<{
  nonce?: string;
  environment: CspEnvironment;
  strategy: CspRenderStrategy;
}>;

/**
 * Tuiles de la carte Leaflet.
 * Domaine exact tiré de `LeafletMap.tsx` : `{s}.basemaps.cartocdn.com`.
 * Images uniquement — les tuiles sont chargées en `<img>`, pas en `fetch`.
 */
const MAP_TILES = "https://*.basemaps.cartocdn.com";

export const CSP_REPORT_PATH = "/api/security/csp-report";

/**
 * Nonce cryptographique, 128 bits, encodé en base64.
 *
 * `crypto.getRandomValues` est disponible dans le runtime Edge comme dans
 * Node ; `Math.random()` n'a évidemment pas sa place ici.
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCodePoint(byte);
  });
  return btoa(binary);
}

function buildScriptSrc(options: BuildCspOptions): string {
  const { environment, strategy, nonce } = options;

  if (environment === "development") {
    // `'unsafe-eval'` est exigé par React Refresh et la carte de sources du
    // mode développement. Il n'est jamais émis en production.
    return `script-src 'self' 'unsafe-eval' 'unsafe-inline' ${TURNSTILE_WIDGET_ORIGIN}`;
  }

  if (strategy === "nonce" && nonce) {
    // `'strict-dynamic'` fait autorité sur les navigateurs modernes ; `'self'`
    // reste pour ceux qui l'ignorent.
    return `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' ${TURNSTILE_WIDGET_ORIGIN}`;
  }

  // Page prérendue : aucun nonce ne peut être injecté dans le HTML.
  // Le nonce est délibérément ABSENT de la directive — s'il y figurait, les
  // navigateurs ignoreraient `'unsafe-inline'` et bloqueraient tout à nouveau.
  return `script-src 'self' 'unsafe-inline' ${TURNSTILE_WIDGET_ORIGIN}`;
}

function buildStyleSrc(options: BuildCspOptions): string {
  const { strategy, nonce, environment } = options;

  if (environment === "production" && strategy === "nonce" && nonce) {
    return `style-src 'self' 'nonce-${nonce}'`;
  }
  // Next.js insère des balises `<style>` sans nonce dans les pages prérendues.
  return "style-src 'self' 'unsafe-inline'";
}

export function buildContentSecurityPolicy(options: BuildCspOptions): string {
  const isProduction = options.environment === "production";

  const directives: string[] = [
    "default-src 'self'",
    buildScriptSrc(options),
    buildStyleSrc(options),

    // React écrit les props `style={{…}}` en attributs `style`, qu'aucun nonce
    // ni hash ne peut couvrir. Un attribut de style n'exécute pas de script ;
    // le risque résiduel est l'exfiltration par sélecteurs CSS.
    "style-src-attr 'unsafe-inline'",

    // `blob:` est requis par les aperçus de photos du formulaire de devis
    // (`URL.createObjectURL`). `data:` couvre les icônes inlinées.
    `img-src 'self' data: blob: ${MAP_TILES}`,

    // `next/font/google` télécharge et auto-héberge les polices au build :
    // aucun domaine Google n'est contacté à l'exécution. Vérifié sur le HTML
    // rendu — les seules feuilles chargées viennent de `/_next/static/css/`.
    "font-src 'self' data:",

    `connect-src 'self' ${TURNSTILE_WIDGET_ORIGIN}`,
    "media-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",

    // Confinement : ces quatre directives ne dépendent d'aucune ressource.
    `frame-src ${TURNSTILE_WIDGET_ORIGIN}`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ];

  if (isProduction) {
    // Jamais en développement : le serveur local est en HTTP.
    directives.push("upgrade-insecure-requests");
  }

  // `report-uri` est déprécié mais reste le plus largement implémenté ;
  // `report-to` est son successeur. On émet les deux.
  directives.push(`report-uri ${CSP_REPORT_PATH}`, "report-to csp-endpoint");

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

export const TURNSTILE_WIDGET_ORIGIN = "https://challenges.cloudflare.com";
