import React, { Suspense } from "react";
import { StepWizard } from "@/components/devis/StepWizard";
import { siteData } from "@/data/siteData";
import { ShieldCheck, Clock, Award, Phone } from "lucide-react";

export const metadata = {
  title: "Demande de Devis Gratuit Toiture Belgique sous 48h",
  description: "Calculez et demandez votre devis de réfection de toiture, recherche de fuite ou démoussage en 5 étapes simples à Bruxelles et Wallonie.",
};

export default function DevisPage() {
  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
        
        {/* Header Title */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
            <Clock className="h-4 w-4" />
            <span>Chiffrage Express Gratuit &amp; Sans Engagement Belgique</span>
          </div>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            Demandez votre devis de toiture
          </h1>
          <p className="text-base text-slate-400">
            Remplissez notre wizard en 5 étapes. Un artisan couvreur agréé étudie votre projet et vous délivre un devis détaillé sous 48h.
          </p>
        </div>

        {/* Wizard Component Wrapper */}
        <Suspense fallback={<div className="text-center py-12 text-slate-400">Chargement du configurateur devis...</div>}>
          <StepWizard />
        </Suspense>

        {/* Guarantees Box below wizard */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 pt-6 text-center text-xs text-slate-400">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <ShieldCheck className="h-5 w-5 text-emerald-400 mx-auto" />
            <p className="font-bold text-white">Garantie Décennale Belge 10 Ans</p>
            <p>Conforme Loi du 31 mai 2017 AXA Belgium.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <Award className="h-5 w-5 text-amber-400 mx-auto" />
            <p className="font-bold text-white">Primes Renolution &amp; Wallonie</p>
            <p>Accompagnement dossiers primes régionales.</p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
            <Phone className="h-5 w-5 text-brand-terracotta mx-auto" />
            <p className="font-bold text-white">Besoin d'aide immédiate ?</p>
            <p>Appelez-nous au {siteData.phoneFormatted}</p>
          </div>
        </div>

      </div>
    </div>
  );
}
