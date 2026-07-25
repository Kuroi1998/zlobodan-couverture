import React from "react";
import Link from "next/link";
import { CheckCircle2, Phone, Home, FileText, ArrowRight } from "lucide-react";
import { siteData } from "@/data/siteData";

export const metadata = {
  title: "Demande de Devis Enregistrée avec Succès",
  description: "Merci pour votre demande de devis. Notre équipe vous recontactera sous 48h.",
};

export default function MerciDevisPage() {
  return (
    <div className="py-20 bg-slate-950 text-white min-h-[80vh] flex items-center justify-center">
      <div className="max-w-2xl mx-auto px-4 text-center space-y-8">
        
        {/* Animated Check Icon */}
        <div className="inline-flex p-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 animate-bounce">
          <CheckCircle2 className="h-16 w-16" />
        </div>

        <div className="space-y-3">
          <span className="text-xs font-extrabold uppercase tracking-widest text-emerald-400">
            Demande bien reçue !
          </span>
          <h1 className="font-heading font-extrabold text-3xl sm:text-5xl text-white tracking-tight">
            Merci pour votre confiance !
          </h1>
          <p className="text-base text-slate-300 max-w-lg mx-auto leading-relaxed">
            Votre dossier de demande de devis est transmis à notre métreur d'astreinte. Nous analysons vos éléments et vous recontactons sous <strong className="text-white">48 heures ouvrées</strong> pour convenir du diagnostic gratuit.
          </p>
        </div>

        {/* Recap Box */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl text-left space-y-4 text-xs text-slate-300">
          <h3 className="font-heading font-bold text-sm text-white border-b border-slate-800 pb-2">
            Prochaines étapes de votre projet :
          </h3>
          <ol className="space-y-3 list-decimal list-inside">
            <li>
              <span className="font-semibold text-white">Appel de confirmation :</span> Un couvreur valide les spécificités d'accès et d'intervention.
            </li>
            <li>
              <span className="font-semibold text-white">Visite technique sur place :</span> Métré précis et contrôle gratuit de la charpente et des voliges.
            </li>
            <li>
              <span className="font-semibold text-white">Remise du devis normé :</span> Récapitulatif clair avec calendrier de chantier et attestation décennale.
            </li>
          </ol>
        </div>

        {/* Urgent Call Option */}
        <div className="bg-brand-terracotta/10 border border-brand-terracotta/30 p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <span className="text-slate-300 font-medium">
            🚨 Une infiltration d'eau active au plafond ? N'attendez pas l'email.
          </span>
          <a
            href={`tel:${siteData.emergencyPhone}`}
            className="shrink-0 bg-brand-terracotta hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-bold transition flex items-center gap-1.5"
          >
            <Phone className="h-3.5 w-3.5" />
            <span>Appel d'urgence : {siteData.emergencyPhoneFormatted}</span>
          </a>
        </div>

        {/* Back Home CTA */}
        <div className="pt-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3.5 rounded-xl text-sm transition border border-slate-700"
          >
            <Home className="h-4 w-4" />
            <span>Retourner à l'accueil</span>
          </Link>
        </div>

      </div>
    </div>
  );
}
