import React from "react";
import Link from "next/link";
import { FileText, Receipt, HardHat, MessageSquare, ArrowRight, ShieldCheck, Clock } from "lucide-react";

export default function ClientDashboardPage() {
  return (
    <div className="space-y-8">
      
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 border border-slate-800 p-8 rounded-3xl space-y-3 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 p-8">
          <ShieldCheck className="h-40 w-40 text-brand-terracotta" />
        </div>
        <span className="inline-block bg-brand-terracotta/20 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-brand-terracotta/30">
          Bienvenue Jean Peeters
        </span>
        <h1 className="font-heading font-extrabold text-2xl sm:text-4xl text-white tracking-tight">
          Tableau de bord de votre projet de toiture
        </h1>
        <p className="text-sm text-slate-400 max-w-2xl">
          Suivez en temps réel la validation de vos devis, le règlement de vos factures immuables et les étapes d'avancement de votre chantier en Belgique.
        </p>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card 1: Devis en attente */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Devis en attente</span>
            <FileText className="h-5 w-5 text-amber-400" />
          </div>
          <p className="font-heading font-extrabold text-3xl text-white">1</p>
          <p className="text-xs text-slate-400">DEV-2026-0012 (Réfection ardoise)</p>
          <Link href="/mon-compte/devis" className="text-xs font-bold text-brand-terracotta hover:underline inline-flex items-center gap-1">
            <span>Examiner &amp; Signer</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 2: Prochaine Échéance Facture */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Échéance Facture</span>
            <Receipt className="h-5 w-5 text-emerald-400" />
          </div>
          <p className="font-heading font-extrabold text-3xl text-emerald-400">4 850 €</p>
          <p className="text-xs text-slate-400">Acompte Chantier Ixelles • Échéance 15/08</p>
          <Link href="/mon-compte/factures" className="text-xs font-bold text-emerald-400 hover:underline inline-flex items-center gap-1">
            <span>Voir la facture</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 3: Avancement Chantier */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Chantier en cours</span>
            <HardHat className="h-5 w-5 text-brand-terracotta" />
          </div>
          <p className="font-heading font-extrabold text-3xl text-white">60%</p>
          <p className="text-xs text-slate-400">Étape : Voligeage &amp; Pose ardoises</p>
          <Link href="/mon-compte/chantiers" className="text-xs font-bold text-brand-terracotta hover:underline inline-flex items-center gap-1">
            <span>Suivre l'avancement</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {/* Card 4: Dernier Message */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-bold uppercase">Messagerie</span>
            <MessageSquare className="h-5 w-5 text-purple-400" />
          </div>
          <p className="font-heading font-extrabold text-3xl text-white">2 Nouveaux</p>
          <p className="text-xs text-slate-400">Dernier par Maître Couvreur Zlobodan</p>
          <Link href="/mon-compte/messages" className="text-xs font-bold text-purple-400 hover:underline inline-flex items-center gap-1">
            <span>Ouvrir la discussion</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>

      {/* Quick Summary Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Recent Quotes */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-brand-terracotta" />
            <span>Devis Récents</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
              <div>
                <p className="font-bold text-white text-sm">DEV-2026-0012 — Réfection toiture mansardée Ixelles</p>
                <p className="text-slate-400">Émis le 22/07/2026 • Validité 30 jours</p>
              </div>
              <span className="bg-amber-950 text-amber-300 border border-amber-800 px-3 py-1 rounded-full font-bold">
                En attente
              </span>
            </div>
          </div>
        </div>

        {/* Current Project Progress */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl space-y-4">
          <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
            <HardHat className="h-5 w-5 text-amber-400" />
            <span>Prochaines Étapes de Votre Chantier</span>
          </h2>
          <div className="space-y-3 text-xs">
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Chantier Ixelles — 160 m² ardoises</span>
                <span className="text-emerald-400 font-bold">En cours</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div className="bg-brand-terracotta h-full w-3/5 rounded-full" />
              </div>
              <p className="text-slate-400">Prochaine intervention : Pose des gouttières en zinc le 28/07/2026</p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
