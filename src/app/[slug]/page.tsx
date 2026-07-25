import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { villesData, VilleData } from "@/data/villes";
import { siteConfig } from "@/config/site";
import { servicesData } from "@/data/services";
import { FAQSection } from "@/components/home/FAQSection";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { MapPin, Phone, CheckCircle2, Clock, ArrowRight, FileText, ShieldCheck, Award } from "lucide-react";

export async function generateStaticParams() {
  return Object.values(villesData).map((v) => ({
    slug: v.slug,
  }));
}

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const ville = Object.values(villesData).find((v) => v.slug === params.slug);
  if (!ville) return {};

  return {
    title: ville.metaTitle,
    description: ville.metaDescription,
    alternates: {
      canonical: `/${ville.slug}`,
    },
  };
}

export default function VillePage({ params }: { params: { slug: string } }) {
  const ville = Object.values(villesData).find((v) => v.slug === params.slug);
  if (!ville) notFound();

  return (
    <>
      <JsonLdSchema
        type="RoofingContractor"
        breadcrumbs={[
          { name: "Accueil", url: "/" },
          { name: `Couvreur ${ville.name}`, url: `/${ville.slug}` },
        ]}
      />

      <div className="bg-slate-950 text-white min-h-screen">
        
        {/* Breadcrumb */}
        <div className="bg-slate-900 border-b border-slate-800 py-3 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto px-4 flex items-center gap-2">
            <Link href="/" className="hover:text-white">Accueil</Link>
            <span>/</span>
            <span className="text-brand-terracotta font-medium">Couvreur {ville.name} ({ville.postalCode})</span>
          </div>
        </div>

        {/* Hero Section Specific to City */}
        <section className="py-16 md:py-24 bg-slate-900 border-b border-slate-800 relative overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl space-y-6">
              
              <div className="inline-flex items-center gap-2 bg-brand-terracotta/20 border border-brand-terracotta/40 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
                <MapPin className="h-3.5 w-3.5" />
                <span>Intervention {ville.name} • {ville.distanceFromBase}</span>
              </div>

              <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
                {ville.heroTitle}
              </h1>

              <p className="text-base sm:text-lg text-slate-300 leading-relaxed">
                {ville.introText}
              </p>

              <div className="flex flex-wrap gap-2 pt-2 text-xs text-slate-300">
                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  📍 Population : {ville.population}
                </span>
                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  ⚡ Dépannage fuite sous 2h
                </span>
                <span className="bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                  🛡️ Assurance SMA BTP Décennale
                </span>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link
                  href="/devis"
                  className="bg-brand-terracotta hover:bg-orange-600 text-white font-extrabold px-7 py-4 rounded-xl text-sm shadow-accent transition text-center flex items-center justify-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  <span>Devis Gratuit à {ville.name} (48h)</span>
                </Link>

                <a
                  href={`tel:${siteConfig.phone}`}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-4 rounded-xl text-sm transition text-center flex items-center justify-center gap-2 border border-slate-700"
                >
                  <Phone className="h-4 w-4 text-emerald-400" />
                  <span>Appeler : {siteConfig.phoneFormatted}</span>
                </a>
              </div>

            </div>
          </div>
        </section>

        {/* Local Architectural & Weather Context (>500 unique words content per city) */}
        <section className="py-16 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              
              {/* Architectural Context */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
                <h2 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-brand-terracotta" />
                  <span>Spécificités du Bâti à {ville.name}</span>
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {ville.localArchitecturalContext}
                </p>

                <div className="pt-2 space-y-2 text-xs text-slate-400">
                  <p className="font-bold text-white uppercase text-[10px]">Couvertures prédominantes :</p>
                  <ul className="space-y-1 list-disc list-inside text-slate-300">
                    {ville.dominantRoofTypes.map((t, idx) => (
                      <li key={idx}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Weather & Local Risks */}
              <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl space-y-4">
                <h2 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
                  <Award className="h-5 w-5 text-amber-400" />
                  <span>Contraintes Climat &amp; Usure à {ville.name}</span>
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {ville.weatherAndRisks}
                </p>

                <div className="pt-2 space-y-2 text-xs text-slate-400">
                  <p className="font-bold text-white uppercase text-[10px]">Services les plus demandés à {ville.name} :</p>
                  <p className="text-slate-300 leading-relaxed">{ville.servicesOfferedText}</p>
                </div>
              </div>

            </div>

            {/* Neighborhoods Served List */}
            <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
              <h3 className="font-heading font-bold text-base text-white">
                Quartiers &amp; Secteurs d'intervention à {ville.name} :
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                {ville.neighborhoodsServed.map((q, idx) => (
                  <span key={idx} className="bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-lg text-slate-300">
                    {q}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* Local Realisations Summary */}
        <section className="py-16 bg-slate-900 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="font-heading font-extrabold text-2xl text-white">
              Exemples de chantiers réalisés à {ville.name}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              {ville.localRealisationsSummary}
            </p>
            <div className="pt-2">
              <Link
                href="/realisations"
                className="inline-flex items-center gap-2 font-bold text-brand-terracotta hover:underline text-sm"
              >
                <span>Consulter toutes nos photos de chantiers en Loire-Atlantique</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Services List Grid */}
        <section className="py-16 bg-slate-950 border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <h2 className="font-heading font-extrabold text-2xl text-white text-center">
              Nos prestations disponibles à {ville.name} ({ville.postalCode})
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {servicesData.map((svc) => (
                <div key={svc.id} className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
                  <h3 className="font-heading font-bold text-lg text-white">{svc.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2">{svc.shortDescription}</p>
                  <Link
                    href={`/services/${svc.slug}`}
                    className="inline-block text-xs font-bold text-brand-terracotta hover:underline pt-2"
                  >
                    En savoir plus →
                  </Link>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Ville FAQ */}
        <FAQSection customItems={ville.faqVille} title={`FAQ Couvreur ${ville.name}`} />

        {/* CTA */}
        <section className="py-16 bg-brand-terracotta text-white text-center">
          <div className="max-w-4xl mx-auto px-4 space-y-6">
            <h2 className="font-heading font-extrabold text-3xl text-white">
              Votre artisan couvreur de proximité à {ville.name}
            </h2>
            <p className="text-sm text-orange-100 max-w-xl mx-auto">
              Diagnostic toiture et devis détaillés remis gratuitement sous 48 heures.
            </p>
            <Link
              href="/devis"
              className="inline-block bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition"
            >
              Demander mon Devis Gratuit →
            </Link>
          </div>
        </section>

      </div>
    </>
  );
}
