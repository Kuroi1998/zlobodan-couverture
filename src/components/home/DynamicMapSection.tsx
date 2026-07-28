"use client";

import React, { useState } from "react";
import Link from "next/link";
import { MapPin, Search, CheckCircle2, AlertCircle } from "lucide-react";
import { siteConfig } from "@/config/site";
import { villesData } from "@/data/villes";
import { LeafletMap } from "@/components/home/LeafletMap";

export const DynamicMapSection: React.FC = () => {
  const [postalInput, setPostalInput] = useState("");
  const [verificationResult, setVerificationResult] = useState<{
    tested: boolean;
    inZone: boolean;
    message: string;
    cityName?: string;
  }>({ tested: false, inZone: false, message: "" });

  const handleCheckPostalCode = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = postalInput.trim();
    if (!cleanCode || (cleanCode.length !== 4 && cleanCode.length !== 5)) {
      setVerificationResult({
        tested: true,
        inZone: false,
        message: "Veuillez saisir un code postal belge à quatre chiffres (ex : 1000, 1180, 1410).",
      });
      return;
    }

    if (siteConfig.coveredPostalCodes.includes(cleanCode)) {
      const foundCity = Object.values(villesData).find(
        (v) => v.postalCode === cleanCode
      )?.name || "Belgique";

      setVerificationResult({
        tested: true,
        inZone: true,
        cityName: foundCity,
        message: `La commune ${cleanCode} ${foundCity} fait partie de notre zone d'intervention.`,
      });
    } else {
      // La branche « hors zone » renvoyait `inZone: true` avec un message
      // affirmant l'appartenance à une « zone étendue » : le vérificateur
      // répondait donc oui à tout code postal belge, ce qui le rendait
      // trompeur. Il dit désormais ce qu'il constate.
      setVerificationResult({
        tested: true,
        inZone: false,
        message: `Le code postal ${cleanCode} se situe hors de notre zone habituelle. Envoyez-nous votre demande : nous vous dirons si nous pouvons intervenir.`,
      });
    }
  };

  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-block bg-slate-800 text-amber-400 text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-slate-700">
            Zone d&apos;intervention
          </span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Notre zone d&apos;intervention
          </h2>
          <p className="text-base text-slate-400">
            {/* L'ancien texte annonçait une adresse non vérifiée et des délais
                d'intervention — « sous 1h à 2h », « sous 24h » — qu'aucune
                organisation connue ne soutenait. */}
            Nous intervenons à {siteConfig.region}. Indiquez-nous votre commune
            dans votre demande : nous vous confirmons si le chantier entre dans
            notre zone.
          </p>
        </div>

        {/* Top: Interactive Checker Card */}
        <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl mb-12 space-y-4">
          <h3 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-brand-terracotta" />
            <span>Vérifiez la disponibilité dans votre commune belge</span>
          </h3>

          <form onSubmit={handleCheckPostalCode} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              value={postalInput}
              onChange={(e) => setPostalInput(e.target.value)}
              placeholder="Entrez votre code postal (ex: 1000, 1410, 1180...)"
              maxLength={5}
              className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-brand-terracotta transition"
            />
            <button
              type="submit"
              className="bg-brand-terracotta hover:bg-orange-600 text-white font-bold px-6 py-3 rounded-xl text-sm transition shadow-accent flex items-center justify-center gap-2"
            >
              <Search className="h-4 w-4" />
              <span>Vérifier en direct</span>
            </button>
          </form>

          {/* Verification Feedback Result */}
          {verificationResult.tested && (
            <div
              className={`p-4 rounded-xl text-sm border flex items-start gap-3 animate-in fade-in duration-200 ${
                verificationResult.inZone
                  ? "bg-emerald-950/60 border-emerald-800 text-emerald-200"
                  : "bg-amber-950/60 border-amber-800 text-amber-200"
              }`}
            >
              {verificationResult.inZone ? (
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              )}
              <div className="space-y-1">
                <p className="font-medium">{verificationResult.message}</p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom: Interactive Leaflet Map & Text List of Cities (SEO Mandatory) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Live Interactive Leaflet OpenStreetMap */}
          <div className="lg:col-span-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="flex items-center gap-1.5 font-bold text-white">
                <MapPin className="h-4 w-4 text-brand-terracotta" />
                Carte interactive OpenStreetMap Belgique
              </span>
              <span className="font-semibold text-slate-400">Communes desservies</span>
            </div>
            <LeafletMap />
          </div>

          {/* Municipalities SEO Text List */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="font-heading font-bold text-xl text-white">
              Communes desservies en Belgique
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accès direct aux pages d&apos;intervention :
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              {Object.values(villesData).map((v) => (
                <Link
                  key={v.slug}
                  href={`/${v.slug}`}
                  className="bg-slate-900 border border-slate-800 hover:border-brand-terracotta p-3 rounded-xl transition text-left group"
                >
                  <p className="font-heading font-bold text-sm text-white group-hover:text-brand-terracotta transition-colors flex items-center justify-between">
                    <span>{v.name}</span>
                    <span className="text-[10px] text-slate-500 font-normal">{v.postalCode}</span>
                  </p>
                </Link>
              ))}
            </div>

            <div className="pt-2 text-xs italic text-slate-400">
              Nous intervenons également sur les communes voisines de Bruxelles
              et du Brabant wallon. Mons ne figure plus dans cette liste : la
              ville se situe hors de la zone annoncée.
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
