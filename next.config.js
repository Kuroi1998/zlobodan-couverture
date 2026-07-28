/**
 * Deux cibles de déploiement, un seul dépôt.
 *
 * Par DÉFAUT (`npm run build`, CI, développement, production Node) : build
 * **serveur** complet. L'application expose des route handlers (auth, PDF,
 * /api/health), un middleware, des pages dynamiques et une base PostgreSQL —
 * tout cela exige un serveur. `output: "export"` casserait ce build.
 *
 * Cible SECONDAIRE, opt-in : une **vitrine statique** sur GitHub Pages. Le
 * workflow `.github/workflows/pages.yml` pose `STATIC_EXPORT=true` ET retire au
 * préalable les routes dynamiques (admin, mon-compte, connexion, api). Seules
 * les pages publiques sont alors exportées. Le drapeau reste faux partout
 * ailleurs, donc le build par défaut n'est jamais un export statique.
 */
const isStaticExport = process.env.STATIC_EXPORT === "true";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  distDir: process.env.NEXT_DIST_DIR || ".next",
  experimental: {
    // Le proxy doit transmettre le multipart complet à la route, qui applique
    // ensuite ses limites plus fines : 10 Mo/fichier, 30 Mo/lot, 32 Mo/requête.
    proxyClientMaxBodySize: "33mb",
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },

  // Activé uniquement sous le workflow vitrine ; jamais pour le build serveur.
  ...(isStaticExport
    ? { output: "export", basePath: process.env.NEXT_PUBLIC_BASE_PATH || "" }
    : {}),

  images: {
    unoptimized: true,
  },

  // Divulgation de pile : `X-Powered-By: Next.js` oriente le choix des
  // exploits sans rendre le moindre service (audit M8).
  poweredByHeader: false,

  // Pas de cartes de source en production : elles reconstituent le code
  // serveur et client d'origine, commentaires compris.
  productionBrowserSourceMaps: false,

  // Les en-têtes de sécurité principaux sont posés par le middleware, qui a
  // besoin du nonce par requête. Ceux-ci sont statiques et s'appliquent aussi
  // aux ressources servies hors du périmètre du middleware.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];

  },
};

module.exports = nextConfig;
