import React from "react";
import Link from "next/link";
import { Hero } from "@/components/home/Hero";
import { ReassuranceBar } from "@/components/home/ReassuranceBar";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { ProcessSection } from "@/components/home/ProcessSection";
import { DynamicMapSection } from "@/components/home/DynamicMapSection";
import { FAQSection } from "@/components/home/FAQSection";
import { JsonLdSchema } from "@/components/seo/JsonLdSchema";
import { Phone, ShieldCheck, ArrowRight } from "lucide-react";
import { siteConfig } from "@/config/site";
import ContactActionButton from "@/components/ui/ContactActionButton";

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

      {/* 5. Process Section (4 steps) */}
      <ProcessSection />


      {/* 7. Interactive Map & SEO Cities Section */}
      <DynamicMapSection />

      {/* 8. FAQ Accordion */}
      <FAQSection />

      {/* 9. Final High-Converting Call-To-Action Banner */}
      <section className="py-20 bg-gradient-to-r from-brand-terracotta to-orange-700 text-white relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
          
          <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
            <ShieldCheck className="h-4 w-4 text-yellow-300" />
            {/*
              « Devis gratuit sous 48h » promettait un délai que rien
              n'organisait, et « maîtres couvreurs agréés » revendiquait un
              agrément dont aucune preuve n'existe. La demande, elle, est bien
              sans engagement : c'est le seul terme conservé.
            */}
            <span>Demande sans engagement</span>
          </div>

          <h2 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight leading-tight">
            Un doute sur l'état de votre toiture ?<br />
            Décrivez-nous votre projet.
          </h2>

          <p className="text-base sm:text-lg text-orange-100 max-w-2xl mx-auto leading-relaxed">
            Nous intervenons à Bruxelles et en Brabant wallon. Décrivez votre
            situation : nous l'analysons et revenons vers vous avec un chiffrage
            détaillé.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/devis"
              className="w-full sm:w-auto bg-slate-950 hover:bg-slate-900 text-white font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition hover:scale-105"
            >
              Demander un devis
            </Link>

            <ContactActionButton className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-950 font-extrabold px-8 py-4 rounded-xl text-base shadow-2xl transition hover:scale-105 flex items-center justify-center gap-2" />
          </div>

        </div>
      </section>
    </>
  );
}
