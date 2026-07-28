/**
 * Cible unique : un build **serveur** Next.js.
 *
 * L'application expose des route handlers (auth, PDF, `/api/health`), un
 * middleware, des pages dynamiques et une base PostgreSQL. Tout cela exige un
 * serveur Node : `output: "export"` casserait le build.
 */

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
