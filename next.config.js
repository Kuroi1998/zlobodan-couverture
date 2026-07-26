/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
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
    const rules = [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-DNS-Prefetch-Control", value: "off" },
        ],
      },
    ];

    // En développement, les chunks App Router ont des noms stables
    // (`app/connexion/page.js`). Les déclarer immuables pendant un an fait
    // réutiliser au navigateur un ancien composant client face au nouveau HTML
    // serveur : React remplace alors toute la page après une erreur
    // d'hydratation. En production, les fichiers sont fingerprintés et peuvent
    // donc être mis en cache sans risque.
    if (process.env.NODE_ENV === "production") {
      rules.push({
        // Ressources immuables : mise en cache longue assumée, elles portent
        // une empreinte dans leur nom.
        source: "/_next/static/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      });
    }

    return rules;
  },
};

module.exports = nextConfig;
