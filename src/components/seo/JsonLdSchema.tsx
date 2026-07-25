import React from "react";
import { escapeJsonForScript } from "@/lib/security/encoding";
import { siteConfig } from "@/config/site";
import { faqData } from "@/data/faq";

interface JsonLdSchemaProps {
  type?: "RoofingContractor" | "FAQPage" | "Service" | "Breadcrumb";
  serviceTitle?: string;
  serviceDescription?: string;
  breadcrumbs?: Array<{ name: string; url: string }>;
}

export const JsonLdSchema: React.FC<JsonLdSchemaProps> = ({
  type = "RoofingContractor",
  serviceTitle,
  serviceDescription,
  breadcrumbs,
}) => {
  // 1. RoofingContractor / LocalBusiness Schema
  const roofingContractorSchema = {
    "@context": "https://schema.org",
    "@type": ["RoofingContractor", "LocalBusiness"],
    "@id": "https://zlobodan-couverture.be/#organization",
    "name": siteConfig.name,
    "legalName": siteConfig.name,
    "url": "https://zlobodan-couverture.be",
    "logo": "https://zlobodan-couverture.be/images/logo.png",
    "image": "https://zlobodan-couverture.be/images/hero-roof.webp",
    "telephone": siteConfig.phone,
    "email": siteConfig.email,
    "priceRange": "€€-€€€",
    "address": {
      "@type": "PostalAddress",
      "streetAddress": siteConfig.address,
      "addressLocality": siteConfig.city,
      "postalCode": siteConfig.postalCode,
      "addressCountry": "BE",
      "addressRegion": siteConfig.region,
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": 50.8503,
      "longitude": 4.3517,
    },
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
        "opens": "07:30",
        "closes": "19:00",
      },
    ],
    "areaServed": siteConfig.coveredPostalCodes.map((cp) => ({
      "@type": "AdministrativeArea",
      "name": `Code postal ${cp} Belgique`,
    })),
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "124",
      "bestRating": "5",
      "worstRating": "1",
    },
    "vatID": siteConfig.tvaIntra,
    "iso6523Code": siteConfig.siret,
  };

  // 2. FAQPage Schema
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqData.map((item) => ({
      "@type": "Question",
      "name": item.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.answer,
      },
    })),
  };

  // 3. Service Schema
  const serviceSchema = serviceTitle
    ? {
        "@context": "https://schema.org",
        "@type": "Service",
        "name": serviceTitle,
        "description": serviceDescription || serviceTitle,
        "provider": {
          "@type": "RoofingContractor",
          "name": siteConfig.name,
          "telephone": siteConfig.phone,
        },
        "areaServed": {
          "@type": "Country",
          "name": "Belgique",
        },
      }
    : null;

  // 4. BreadcrumbList Schema
  const breadcrumbSchema = breadcrumbs
    ? {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": breadcrumbs.map((bc, idx) => ({
          "@type": "ListItem",
          "position": idx + 1,
          "name": bc.name,
          "item": `https://zlobodan-couverture.be${bc.url}`,
        })),
      }
    : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: escapeJsonForScript(roofingContractorSchema) }}
      />
      {type === "FAQPage" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(faqSchema) }}
        />
      )}
      {serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(serviceSchema) }}
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(breadcrumbSchema) }}
        />
      )}
    </>
  );
};
