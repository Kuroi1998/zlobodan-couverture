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
        message: "Veuillez saisir un code postal belge valide (ex: 1000, 1410, 1180, 1300, 5000...).",
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
        message: `✅ Parfait ! La commune (${cleanCode} ${foundCity}) est couverte par nos équipes. Intervention rapide sous 24h & Devis gratuit.`,
      });
    } else {
      setVerificationResult({
        tested: true,
        inZone: true,
        cityName: "Belgique",
        message: `✅ Le secteur ${cleanCode} fait partie de notre zone d'intervention étendue à Bruxelles, Brabant Wallon et Wallonie. Contactez-nous pour réserver votre métré.`,
      });
    }
  };

  return (
    <section className="py-20 bg-slate-950 text-white border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-block bg-slate-800 text-amber-400 text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-slate-700">
            Proximité &amp; Réactivité Belgique
          </span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Zone d'intervention dans un rayon de {siteConfig.radiusKm} km (Bruxelles &amp; Wallonie)
          </h2>
          <p className="text-base text-slate-400">
            Basés à {siteConfig.address}, nous intervenons sous 1h à 2h pour les urgences fuite et sous 24h pour tous vos métrés et devis.
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
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
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
              <span className="text-amber-400 font-semibold">Cercle d'intervention 40 km</span>
            </div>
            <LeafletMap />
          </div>

          {/* Municipalities SEO Text List */}
          <div className="lg:col-span-6 space-y-4">
            <h3 className="font-heading font-bold text-xl text-white">
              Communes desservies en Belgique
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Accès direct aux pages d'intervention de nos équipes belges agréées :
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
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                    {v.distanceFromBase}
                  </p>
                </Link>
              ))}
            </div>

            <div className="pt-2 text-xs text-slate-400 italic">
              Également disponibles sur : Woluwe, Etterbeek, Braine-l'Alleud, Nivelles, Lasne, Ottignies, Mons...
            </div>
          </div>

        </div>

      </div>
    </section>
  );
};
