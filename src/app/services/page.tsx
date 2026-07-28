import React from "react";
import { ServicesGrid } from "@/components/home/ServicesGrid";
import { FAQSection } from "@/components/home/FAQSection";

export const metadata = {
  title: "Nos Prestations de Couverture & Zinguerie en Belgique",
  description: "Découvrez nos 6 services spécialisés : réfection de toiture, recherche de fuite d'urgence, démoussage hydrofuge, zinguerie, isolation et Velux.",
};

export default function ServicesPage() {
  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
            Expertise &amp; Savoir-Faire Belge
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            Nos Services de Couverture à Bruxelles &amp; Wallonie
          </h1>
          <p className="text-base text-slate-400">
            De la réfection complète de toitures en ardoises et tuiles à la
            recherche et la réparation de fuites.
          </p>
        </div>

        {/* Services Grid Component */}
        <ServicesGrid />

        {/* FAQ */}
        <FAQSection />

      </div>
    </div>
  );
}
