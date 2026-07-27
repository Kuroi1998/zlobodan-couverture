import type { Metadata } from "next";
import { Inter, Barlow } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileCallBar } from "@/components/layout/MobileCallBar";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { siteConfig } from "@/config/site";
import { companyIdentity } from "@/config/company";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlow = Barlow({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    // Le titre par défaut promettait un « Devis Gratuit 48h » : une métadonnée
    // est indexée puis affichée dans les résultats, elle ne doit pas porter un
    // engagement que les pages elles-mêmes n'énoncent plus.
    default: `${siteConfig.shortName} | Couvreur-zingueur à Bruxelles et en Brabant wallon`,
    template: `%s | ${siteConfig.shortName}`,
  },
  description: siteConfig.description,
  keywords: [
    "couvreur bruxelles",
    "couvreur waterloo",
    "couvreur uccle",
    "couvreur wavre",
    "réfection toiture belgique",
    "urgence fuite toiture bruxelles",
    "démoussage toiture belgique",
    "zinguerie belgique",
    "isolation toiture prime renolution wallonie",
    "garantie décennale toiture belgique",
  ],
  authors: [{ name: siteConfig.name }],
  creator: siteConfig.name,
  metadataBase: new URL(companyIdentity.websiteUrl),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteConfig.name,
    description: siteConfig.description,
    url: companyIdentity.websiteUrl,
    siteName: siteConfig.name,
    locale: "fr_BE",
    type: "website",
    // Aucune image Open Graph : le visuel référencé était un fichier de
    // substitution, supprimé faute d'origine documentée. Une carte de partage
    // sans image vaut mieux qu'un lien vers une ressource absente.
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="fr"
      className={`${inter.variable} ${barlow.variable}`}
      data-scroll-behavior="smooth"
    >
      <head>
        <JsonLdSchema type="RoofingContractor" />
      </head>
      <body className="font-sans bg-slate-950 text-slate-100 antialiased flex flex-col min-h-screen">
        <Header />
        <main className="flex-grow">{children}</main>
        <Footer />
        <MobileCallBar />
        <CookieBanner />
      </body>
    </html>
  );
}
