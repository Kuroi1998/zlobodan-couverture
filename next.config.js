/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
      {
        // Ressources immuables : mise en cache longue assumée, elles portent
        // une empreinte dans leur nom.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

module.exports = nextConfig;
