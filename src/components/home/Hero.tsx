"use client";

import React from "react";
import Link from "next/link";
import { FileText, ShieldCheck, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { siteConfig } from "@/config/site";
import ContactActionButton from "@/components/ui/ContactActionButton";

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-slate-950 text-white overflow-hidden pt-8 pb-16 md:py-24">
      {/*
        Fond dégradé plutôt qu'une photographie : le fichier utilisé
        (`hero-roof.webp`, 1,8 Ko) était un substitut sans origine documentée.
        Un aplat maîtrisé vaut mieux qu'une image dont on ne peut pas justifier
        les droits.
      */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/*
              La pastille affichait « 4.9 / 5 », « 124+ avis clients vérifiés
              Google » et « Artisan Certifié ». Aucune de ces trois mentions
              n'était adossée à une source : ni profil Google, ni certification.
              Elle annonce désormais la zone d'intervention, qui est vérifiable.
            */}
            <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/90 px-3.5 py-1.5 text-xs font-medium backdrop-blur-md">
              <span className="flex items-center gap-1 font-semibold text-emerald-400">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {siteConfig.region}
              </span>
            </div>

            {/* H1 Title */}
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Couvreur-Zingueur à <span className="text-brand-terracotta">{siteConfig.city}</span> & Agglomération
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Réfection de toiture, recherche et réparation de fuites, démoussage,
              pose de fenêtres de toit et travaux de zinguerie à{" "}
              <strong className="font-semibold text-white">{siteConfig.region}</strong>.
            </p>

            {/* Key USPs / Badges list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                {/* « SMA BTP » est un assureur français : trace du modèle d'origine. */}
                <span>Responsabilité décennale (droit belge)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-amber-500/20 text-amber-400 p-1 rounded">
                  <Clock className="h-4 w-4" />
                </div>
                <span>Devis détaillé après analyse</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-brand-terracotta/20 text-brand-terracotta p-1 rounded">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Urgences traitées en priorité</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/20 text-blue-400 p-1 rounded">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                {/* RGE et Qualibat sont des dispositifs français, sans équivalent ici. */}
                <span>Accompagnement aux primes régionales</span>
              </div>
            </div>

            {/* Dual CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4">
              <Link
                href="/devis"
                className="flex items-center justify-center gap-2.5 bg-brand-terracotta hover:bg-orange-600 text-white px-7 py-4 rounded-xl text-base font-bold shadow-accent transition-all hover:scale-[1.02] active:scale-95 text-center"
              >
                <FileText className="h-5 w-5" />
                <span>Obtenir mon Devis Gratuit en 2 min</span>
              </Link>

              <ContactActionButton
                className="flex items-center justify-center gap-2.5 rounded-xl border border-slate-700 bg-slate-800/90 px-6 py-4 text-center text-base font-semibold text-white transition-all hover:border-slate-500 hover:bg-slate-800"
                fallbackLabel="Nous écrire"
              />
            </div>

          </div>

          {/* Right Column: Reassurance Card & Image Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">Besoin d'un couvreur rapide ?</h2>
                  <p className="text-xs text-slate-400">
                    Décrivez votre situation, nous l&apos;analysons
                  </p>
                </div>
                <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-1 rounded-full font-bold border border-emerald-500/20">
                  En ligne
                </span>
              </div>

              {/* Quick Postal Code Check widget */}
              <div className="space-y-3">
                <p className="text-xs text-slate-300 font-medium">
                  📍 Vérifiez si nous intervenons dans votre commune :
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Code postal belge"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Ex: 1000, 1410, 1180..."
                    maxLength={5}
                    id="hero-cp-input"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById("hero-cp-input") as HTMLInputElement)?.value.trim();
                      // La branche intermédiaire répondait « fait partie de
                      // notre zone » à *n'importe quel* code à quatre chiffres,
                      // y compris hors zone : le vérificateur disait toujours
                      // oui, ce qui le rendait au mieux inutile, au pire
                      // trompeur.
                      if (siteConfig.coveredPostalCodes.includes(val)) {
                        alert(`Oui, le code postal ${val} fait partie de notre zone d'intervention.`);
                      } else if (/^[0-9]{4}$/.test(val)) {
                        alert(`Le code postal ${val} se situe hors de notre zone habituelle. Envoyez-nous votre demande : nous vous dirons si nous pouvons intervenir.`);
                      } else {
                        alert("Veuillez saisir un code postal belge à quatre chiffres (ex : 1000, 1180, 1410).");
                      }
                    }}
                    className="bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white px-4 py-2.5 rounded-lg text-xs font-bold transition"
                  >
                    Vérifier
                  </button>
                </div>
              </div>

              {/* Trust highlights */}
              <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Attestation décennale remise avec le devis</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Prix ferme &amp; définitif sans surprise</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>Nettoyage complet du chantier en fin d'intervention</span>
                </div>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
