import React from "react";
import Link from "next/link";
import { siteData } from "@/data/siteData";
import { ShieldCheck, Award, Users, Wrench, CheckCircle2, FileText, Phone } from "lucide-react";

export const metadata = {
  title: "À Propos | Entreprise Zlobodan Couverture Belgique",
  description: "Découvrez notre histoire, notre équipe d'artisans couvreurs agréés en Belgique, nos agréments pour les primes Renolution/Wallonie et nos équipements.",
};

export default function AProposPage() {
  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen space-y-16">
      
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-4 px-4">
        <span className="inline-block bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
          Savoir-Faire &amp; Valeurs Belges
        </span>
        <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
          L'Entreprise Zlobodan Couverture SRL
        </h1>
        <p className="text-base text-slate-400">
          Artisans couvreurs-zingueurs passionnés au service des propriétaires bruxellois et wallons depuis plus de {siteData.experienceYears} ans.
        </p>
      </div>

      {/* History & Core Values */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h2 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
              Une tradition d'excellence au service de la toiture en Belgique
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              Fondée à Bruxelles par des professionnels de la couverture en ardoises et tuiles terre cuite belges (Pottelberg/Koramic), la maison **Zlobodan Couverture SRL** a forgé sa réputation sur l'exigence du travail bien fait, le respect des normes STS et la réactivité d'urgence.
            </p>
            <p className="text-sm text-slate-300 leading-relaxed">
              L'intégralité de nos chantiers est exécutée et supervisée par nos propres équipes diplômées, agréées et assurées en Responsabilité Civile Décennale Belge.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                <span className="font-heading font-extrabold text-3xl text-brand-terracotta">700+</span>
                <p className="text-xs text-slate-400">Toitures rénovées</p>
              </div>
              <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-1">
                <span className="font-heading font-extrabold text-3xl text-emerald-400">100%</span>
                <p className="text-xs text-slate-400">Garanti Décennale (Loi 31 mai 2017)</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl space-y-6">
            <h3 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <Award className="h-6 w-6 text-amber-400" />
              <span>Nos Agréments &amp; Assurances en Belgique</span>
            </h3>

            <div className="space-y-4 text-xs text-slate-300">
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">Garantie Décennale AXA Belgium</p>
                <p>Police d'assurance n° {siteData.insuranceNumber} couvrant l'étanchéité et la solidité de l'ouvrage pendant 10 ans selon la loi belge.</p>
              </div>

              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <p className="font-bold text-white text-sm">Entrepreneur Agréé Primes Régionales</p>
                <p>Dossier technique d'accompagnement pour les Primes Renolution (Bruxelles-Capitale) et Primes Habitation (Région Wallonne).</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
