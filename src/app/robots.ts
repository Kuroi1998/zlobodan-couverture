import { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Mesure d'hygiène, jamais un contrôle d'accès : ces zones sont
      // protégées par les gardes serveur (lib/security/guards.ts).
      disallow: ["/api/", "/admin", "/mon-compte", "/devis/merci"],
    },
    sitemap: "https://zlobodan-couverture.be/sitemap.xml",
  };
}
