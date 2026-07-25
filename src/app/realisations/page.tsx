import React from "react";
import Link from "next/link";
import Image from "next/image";
import { realisationsData, RealisationItem } from "@/data/realisations";
import { BeforeAfterSlider } from "@/components/realisations/BeforeAfterSlider";
import { MapPin, Clock, ArrowRight, Star } from "lucide-react";

export const metadata = {
  title: "Réalisations & Portfolio Chantiers Toiture Belgique",
  description: "Découvrez nos chantiers de réfection toiture, zinguerie, pose de Velux et démoussage réalisés à Bruxelles, Waterloo, Uccle, Wavre et Namur avec photos Avant/Après.",
};

export default function RealisationsPage() {
  return (
    <div className="py-12 bg-slate-950 text-white min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="inline-block bg-slate-900 border border-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full">
            Preuves de Savoir-Faire
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            Nos Réalisations de Toiture en Belgique
          </h1>
          <p className="text-base text-slate-400">
            Chantiers de réfection d'ardoises, tuiles terre cuite Koramic, zinguerie et isolation réalisés par nos équipes.
          </p>
        </div>

        {/* Highlighted Before/After Slider */}
        <div className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl space-y-6">
          <span className="text-xs font-bold text-brand-terracotta uppercase tracking-wider">
            Focus Avant / Après Rénovation
          </span>
          <BeforeAfterSlider
            beforeImage="/images/chantiers/before-after-01.webp"
            afterImage="/images/chantiers/chantier-01.webp"
            title="Réfection complète de 160 m² d'ardoises clouées — Bruxelles (Ixelles)"
          />
        </div>

        {/* Realisations Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {realisationsData.map((project: RealisationItem) => (
            <div
              key={project.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col justify-between hover:border-slate-700 transition group"
            >
              <div className="space-y-4">
                <div className="relative h-56 w-full overflow-hidden">
                  <Image
                    src={project.mainImage}
                    alt={project.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-bold text-white border border-slate-700 flex items-center gap-1">
                    <MapPin className="h-3 w-3 text-brand-terracotta" />
                    <span>{project.city} ({project.postalCode})</span>
                  </div>
                </div>

                <div className="p-6 space-y-3">
                  <span className="text-[10px] font-bold text-brand-terracotta uppercase tracking-widest bg-brand-terracotta/10 px-2.5 py-1 rounded">
                    {project.roofType}
                  </span>

                  <h3 className="font-heading font-bold text-lg text-white group-hover:text-brand-terracotta transition-colors line-clamp-2">
                    {project.title}
                  </h3>

                  <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                    {project.solutionApplied}
                  </p>

                  {project.clientReview && (
                    <div className="pt-2 border-t border-slate-800 text-xs italic text-amber-300 flex items-start gap-1">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400 shrink-0 mt-0.5" />
                      <span className="line-clamp-2">"{project.clientReview.text}"</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="p-6 pt-0 border-t border-slate-800/60 mt-4 flex items-center justify-between text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  {project.durationDays} jours de travaux
                </span>
                <Link
                  href={`/realisations/${project.slug}`}
                  className="font-bold text-brand-terracotta hover:underline flex items-center gap-1"
                >
                  <span>Fiche détaillée</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}
