import { escapeJsonForScript } from "@/lib/security/encoding";
import { siteConfig } from "@/config/site";
import { companyIdentity } from "@/config/company";
import { faqData } from "@/data/faq";

const SITE_URL = companyIdentity.websiteUrl;

type BreadcrumbItem = Readonly<{
  name: string;
  url: `/${string}`;
}>;

type JsonLdSchemaProps = Readonly<{
  type?: "RoofingContractor" | "FAQPage" | "Service" | "Breadcrumb";
  serviceTitle?: string;
  serviceDescription?: string;
  breadcrumbs?: readonly BreadcrumbItem[];
}>;

function toAbsoluteUrl(url: `/${string}`): string {
  return new URL(url, SITE_URL).toString();
}

export function JsonLdSchema({
  type = "RoofingContractor",
  serviceTitle,
  serviceDescription,
  breadcrumbs,
}: JsonLdSchemaProps) {
  // 1. RoofingContractor / LocalBusiness Schema
  /**
   * Données structurées de l'entreprise.
   *
   * Un balisage schema.org est lu par les moteurs et affiché tel quel dans les
   * résultats : y placer une donnée fausse la diffuse bien au-delà du site.
   *
   * Ont été retirés lors de l'audit du 2026-07-27 :
   *
   *  - `aggregateRating` (4,9 sur 124 avis) — aucun profil d'avis n'existe.
   *    Un balisage d'avis inventé contrevient de surcroît aux règles des
   *    moteurs et expose à une sanction de référencement ;
   *  - `logo`, qui pointait vers `/images/logo.png`, fichier absent du dépôt ;
   *  - `image`, qui désignait un visuel de substitution supprimé ;
   *  - `vatID` et `iso6523Code`, alimentés par un numéro d'entreprise non
   *    vérifié ;
   *  - `priceRange`, qui annonçait une fourchette sans base ;
   *  - `geo`, dont les coordonnées désignaient le centre de Bruxelles et non
   *    un établissement connu.
   *
   * Les champs restants ne sont émis que lorsque la donnée correspondante est
   * réellement disponible : le balisage doit refléter le contenu visible.
   */
  const address = companyIdentity.registeredAddress;

  const roofingContractorSchema = {
    "@context": "https://schema.org",
    "@type": ["RoofingContractor", "LocalBusiness"],
    "@id": `${SITE_URL}/#organization`,
    "name": companyIdentity.tradeName,
    ...(companyIdentity.legalName ? { legalName: companyIdentity.legalName } : {}),
    "url": SITE_URL,
    "description": siteConfig.description,
    ...(companyIdentity.publicPhone ? { telephone: companyIdentity.publicPhone } : {}),
    ...(companyIdentity.publicEmail ? { email: companyIdentity.publicEmail } : {}),
    ...(address
      ? {
          address: {
            "@type": "PostalAddress",
            streetAddress: address.street,
            addressLocality: address.locality,
            postalCode: address.postalCode,
            addressCountry: "BE",
          },
        }
      : {}),
    "openingHoursSpecification": [
      {
        "@type": "OpeningHoursSpecification",
        "dayOfWeek": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        "opens": "08:00",
        "closes": "17:00",
      },
    ],
    "areaServed": siteConfig.coveredPostalCodes.map((cp) => ({
      "@type": "PostalCodeSpecification",
      "postalCode": cp,
      "addressCountry": "BE",
    })),
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
          "name": companyIdentity.tradeName,
          ...(companyIdentity.publicPhone
            ? { telephone: companyIdentity.publicPhone }
            : {}),
        },
        // La zone déclarée était « Belgique » entière, alors que le site
        // annonce Bruxelles et le Brabant wallon.
        "areaServed": {
          "@type": "AdministrativeArea",
          "name": siteConfig.region,
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
          "item": toAbsoluteUrl(bc.url),
        })),
      }
    : null;

  return (
    <>
      {type === "RoofingContractor" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(roofingContractorSchema) }} // nosemgrep
        />
      )}
      {type === "FAQPage" && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(faqSchema) }} // nosemgrep
        />
      )}
      {type === "Service" && serviceSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(serviceSchema) }} // nosemgrep
        />
      )}
      {breadcrumbSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: escapeJsonForScript(breadcrumbSchema) }} // nosemgrep
        />
      )}
    </>
  );
}
