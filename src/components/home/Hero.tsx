"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { Phone, FileText, ShieldCheck, Star, MapPin, Clock, CheckCircle2 } from "lucide-react";
import { siteConfig } from "@/config/site";

export const Hero: React.FC = () => {
  return (
    <section className="relative bg-slate-950 text-white overflow-hidden pt-8 pb-16 md:py-24">
      {/* Background Image with Dark Overlay Gradient */}
      <div className="absolute inset-0 z-0 opacity-30">
        <Image
          src="/images/hero-roof.webp"
          alt="Couvreur-Zingueur pose ardoise Bruxelles"
          fill
          priority
          className="object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-950/60" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Heading & CTAs */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Top Google & Certification Pill */}
            <div className="inline-flex flex-wrap items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-xs font-medium backdrop-blur-md">
              <span className="flex items-center text-amber-400 font-bold gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                <span>4.9 / 5</span>
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-300">124+ avis clients vérifiés Google</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Artisan Certifié
              </span>
            </div>

            {/* H1 Title */}
            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Couvreur-Zingueur à <span className="text-brand-terracotta">{siteConfig.city}</span> & Agglomération
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-300 max-w-2xl leading-relaxed">
              Réfection complète de toiture, recherche de fuite d'urgence 24/7, démoussage hydrofuge &amp; pose de Velux dans un rayon de <strong className="text-white font-semibold">{siteConfig.radiusKm} km</strong>.
            </p>

            {/* Key USPs / Badges list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-2">
                <div className="bg-emerald-500/20 text-emerald-400 p-1 rounded">
                  <ShieldCheck className="h-4 w-4" />
                </div>
                <span>Garantie Décennale SMA BTP (10 ans)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-amber-500/20 text-amber-400 p-1 rounded">
                  <Clock className="h-4 w-4" />
                </div>
                <span>{siteConfig.responseDelay}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-brand-terracotta/20 text-brand-terracotta p-1 rounded">
                  <MapPin className="h-4 w-4" />
                </div>
                <span>Intervention sous 2h sur fuite active</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="bg-blue-500/20 text-blue-400 p-1 rounded">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <span>Entreprise RGE Qualibat</span>
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

              <a
                href={`tel:${siteConfig.emergencyPhone}`}
                className="flex items-center justify-center gap-2.5 bg-slate-800/90 border border-slate-700 hover:border-slate-500 text-white px-6 py-4 rounded-xl text-base font-semibold transition-all hover:bg-slate-800 text-center"
              >
                <Phone className="h-5 w-5 text-emerald-400 animate-pulse" />
                <span>Urgence 24/7 : {siteConfig.emergencyPhoneFormatted}</span>
              </a>
            </div>

          </div>

          {/* Right Column: Reassurance Card & Image Showcase */}
          <div className="lg:col-span-5 relative">
            <div className="bg-slate-900/90 border border-slate-800 p-6 md:p-8 rounded-2xl shadow-2xl backdrop-blur-md space-y-6">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">Besoin d'un couvreur rapide ?</h2>
                  <p className="text-xs text-slate-400">Diagnostic toiture gratuit à domicile</p>
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
                    placeholder="Ex: 1000, 1410, 1180..."
                    maxLength={5}
                    id="hero-cp-input"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-brand-terracotta"
                  />
                  <button
                    onClick={() => {
                      const val = (document.getElementById("hero-cp-input") as HTMLInputElement)?.value.trim();
                      if (siteConfig.coveredPostalCodes.includes(val)) {
                        alert(`✅ Oui ! ${val} fait partie de notre zone d'intervention directe sous 24h.`);
                      } else if (val.length === 4) {
                        alert(`ℹ️ Le code postal belge ${val} fait partie de notre zone d'intervention. Contactez-nous au ${siteConfig.phoneFormatted} pour réserver votre métré.`);
                      } else {
                        alert("Veuillez saisir un code postal belge (ex: 1000, 1410, 1180, 1300, 5000...).");
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
