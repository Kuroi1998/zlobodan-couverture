import { MetadataRoute } from "next";
import { servicesData } from "@/data/servicesData";
import { realisationsData } from "@/data/realisationsData";
import { villesData } from "@/data/villesData";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://zlobodan-couverture.fr";

  const staticPages = [
    "",
    "/devis",
    "/devis/merci",
    "/services",
    "/realisations",
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

  const realisationPages = realisationsData.map((r) => ({
    url: `${baseUrl}/realisations/${r.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const cityPages = Object.values(villesData).map((v) => ({
    url: `${baseUrl}/${v.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.9,
  }));

  return [...staticPages, ...servicePages, ...realisationPages, ...cityPages];
}
