import type { Metadata } from "next";
import { Inter, Barlow } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { MobileCallBar } from "@/components/layout/MobileCallBar";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { siteData } from "@/data/siteData";

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
    default: `${siteData.shortName} | Couvreur-Zinguerie Bruxelles & Wallonie - Devis Gratuit 48h`,
    template: `%s | ${siteData.shortName}`,
  },
  description: siteData.description,
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
  authors: [{ name: siteData.name }],
  creator: siteData.name,
  metadataBase: new URL("https://zlobodan-couverture.be"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: siteData.name,
    description: siteData.description,
    url: "https://zlobodan-couverture.be",
    siteName: siteData.name,
    locale: "fr_BE",
    type: "website",
    images: [
      {
        url: "/images/hero-roof.webp",
        width: 1200,
        height: 630,
        alt: `${siteData.name} Couvreur en Belgique`,
      },
    ],
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
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${inter.variable} ${barlow.variable}`}>
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
