import { MetadataRoute } from "next";
import { servicesData } from "@/data/services";
import { villesData } from "@/data/villes";
import { companyIdentity } from "@/config/company";

export const dynamic = "force-static";

export default function sitemap(): MetadataRoute.Sitemap {
  // Le domaine était déclaré en `.fr` ici et en `.be` dans les données
  // structurées : deux origines canoniques contradictoires pour un même site.
  // Il vient désormais de la configuration d'entreprise, source unique.
  const baseUrl = companyIdentity.websiteUrl;

  const staticPages = [
    "",
    "/devis",
    "/devis/merci",
    "/services",
    "/a-propos",
    "/contact",
    "/mentions-legales",
    "/politique-de-confidentialite",
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1.0 : 0.8,
  }));

  const servicePages = servicesData.map((s) => ({
    url: `${baseUrl}/services/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.9,
  }));

  const cityPages = Object.values(villesData).map((v) => ({
    url: `${baseUrl}/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...servicePages, ...cityPages];
}
