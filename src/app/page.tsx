import React from "react";
import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { ReassuranceBar } from "@/components/home/ReassuranceBar";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ProcessSection } from "@/components/home/ProcessSection";
import { BeforeAfterSlider } from "@/components/realisations/BeforeAfterSlider";
import { GoogleReviewsCarousel } from "@/components/reviews/GoogleReviewsCarousel";
import { DynamicMapSection } from "@/components/home/DynamicMapSection";
import { FAQSection } from "@/components/home/FAQSection";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { Phone, ShieldCheck, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";

export default function HomePage() {
  return (
    <>
      <JsonLdSchema type="FAQPage" />

      {/* 1. Hero Section */}
      <Hero />

      {/* 2. Reassurance Bar */}
      <ReassuranceBar />

      {/* 3. Services Grid (6 cards) */}
      <ServicesGrid />

      {/* 4. Realisations Showcase (Avant / Après Slider) */}
      <section className="py-20 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
          
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-block bg-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-slate-700">
                Preuves Sociales &amp; Savoir-Faire
              </span>
              <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
                Découvrez l'avant / après de nos chantiers récents
              </h2>
              <p className="text-base text-slate-400">
                Visualisez la qualité de nos finitions sur toitures en ardoises, tuiles et zingueries en Belgique.
              </p>
            </div>

            <Link
              href="/realisations"
              className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition border border-slate-700"
            >
              <span>Voir le portfolio complet</span>
              <ArrowRight className="h-4 w-4 text-brand-terracotta" />
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            
            {/* Slider Column */}
            <div className="lg:col-span-7">
              <BeforeAfterSlider
                beforeImage="/images/chantiers/before-after-01.webp"
                afterImage="/images/chantiers/chantier-01.webp"
                title="Réfection intégrale de 160 m² d'ardoises clouées — Bruxelles (Ixelles)"
              />
            </div>

            {/* Explanatory Box Column */}
            <div className="lg:col-span-5 bg-slate-950 border border-slate-800 p-8 rounded-2xl space-y-6">
              <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">
                Chantier Référence Belgique #BE-01
              </span>
              <h3 className="font-heading font-extrabold text-xl text-white">
                Réfection de toiture mansardée &amp; Zingueries
              </h3>
              <ul className="space-y-2.5 text-xs text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Problème initial :</strong> Tuiles &amp; ardoises poreuses, crochets rouillés, fuites au solin de cheminée.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Solution apportée :</strong> Dépose soignée, sous-toiture HPV Doerken, ardoises Cupa clouées &amp; zingueries neuves.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span><strong>Durée des travaux :</strong> 6 jours ouvrables avec étanchéité garantie chaque soir.</span>
                </li>
              </ul>

              <div className="pt-4 border-t border-slate-900 flex items-center justify-between text-xs">
                <span className="text-slate-400">Garantie Décennale AXA Belge</span>
                <Link href="/realisations/refection-toiture-ardoise-bruxelles-ixelles" className="font-bold text-brand-terracotta hover:underline">
                  Fiche projet →
                </Link>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* 5. Process Section (4 steps) */}
      <ProcessSection />

      {/* 6. Google Verified Customer Reviews Carousel */}
      <GoogleReviewsCarousel />

      {/* 7. Interactive Map & SEO Cities Section */}
      <DynamicMapSection />

      {/* 8. FAQ Accordion */}
      <FAQSection />

      {/* 9. Final High-Converting Call-To-Action Banner */}
      <section className="py-20 bg-gradient-to-r from-brand-terracotta to-orange-700 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-yellow-300" />
            <span>Devis Gratuit &amp; Sans Engagement Sous 48h</span>
          </div>

          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Un doute sur l'état de votre toiture ?<br />
            Confiez votre projet à nos maîtres couvreurs agréés.
          </h2>

          <p className="text-base sm:text-lg text-orange-100 max-w-2xl mx-auto leading-relaxed">
            Intervention à Bruxelles, Brabant Wallon et Wallonie. Diagnostic et devis méticuleux 100% gratuits.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/devis"
              className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition hover:scale-105"
            >
              Demander mon Devis Gratuit
            </Link>

            <a
              href={`tel:${siteConfig.phone}`}
              className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-950 font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition hover:scale-105 flex items-center justify-center gap-2"
            >
              <Phone className="h-5 w-5 text-brand-terracotta" />
              <span>Appeler le {siteConfig.phoneFormatted}</span>
            </a>
          </div>

        </div>
      </section>
    </>
  );
}
