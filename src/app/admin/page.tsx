import React from "react";
import Link from "next/link";
import { Inbox, FileText, Receipt, HardHat, ShieldCheck, ArrowRight } from "lucide-react";

export default function AdminDashboardPage() {
  return (
    <div className="space-y-6">
      
      {/* Dense Metric Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-950 border border-slate-800 p-4 rounded space-y-1">
          <span className="text-slate-500 uppercase text-[10px]">Demandes Entrantes</span>
          <p className="text-2xl font-bold text-amber-400">3 Nouvelles</p>
          <p className="text-[10px] text-slate-400">Formulaire public wizard</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded space-y-1">
          <span className="text-slate-500 uppercase text-[10px]">Devis En Cours</span>
          <p className="text-2xl font-bold text-blue-400">12 Émis</p>
          <p className="text-[10px] text-slate-400">145 800 € Total HT</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded space-y-1">
          <span className="text-slate-500 uppercase text-[10px]">Factures À Encaisser</span>
          <p className="text-2xl font-bold text-emerald-400">4 850 €</p>
          <p className="text-[10px] text-slate-400">TVA 6.00% Belge incluse</p>
        </div>

        <div className="bg-slate-950 border border-slate-800 p-4 rounded space-y-1">
          <span className="text-slate-500 uppercase text-[10px]">Chantiers Actifs</span>
          <p className="text-2xl font-bold text-orange-400">4 Sur le terrain</p>
          <p className="text-[10px] text-slate-400">Bruxelles &amp; Wallonie</p>
        </div>

      </div>

      {/* Inbound Requests Queue Table */}
      <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-sm text-white flex items-center gap-2">
            <Inbox className="h-4 w-4 text-amber-400" />
            <span>File des Dernières Demandes de Devis Entrantes</span>
          </h2>
          <Link href="/admin/demandes" className="text-brand-terracotta text-xs hover:underline">
            Voir tout →
          </Link>
        </div>

        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-2.5 border-b border-slate-800">Horodatage</th>
              <th className="p-2.5 border-b border-slate-800">Nom / Contact</th>
              <th className="p-2.5 border-b border-slate-800">Commune / CP</th>
              <th className="p-2.5 border-b border-slate-800">Prestation</th>
              <th className="p-2.5 border-b border-slate-800">Urgence</th>
              <th className="p-2.5 border-b border-slate-800 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            <tr className="hover:bg-slate-900/50">
              <td className="p-2.5 text-slate-400">25/07 13:40</td>
              <td className="p-2.5 font-bold text-white">Jean Peeters (0470 12 34 56)</td>
              <td className="p-2.5">1050 Ixelles</td>
              <td className="p-2.5">Réfection ardoises naturelle</td>
              <td className="p-2.5"><span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-[10px]">Normal</span></td>
              <td className="p-2.5 text-right">
                <Link href="/admin/devis" className="bg-brand-terracotta text-white px-2.5 py-1 rounded font-bold text-[10px]">
                  Convertir en Devis
                </Link>
              </td>
            </tr>
            <tr className="hover:bg-slate-900/50">
              <td className="p-2.5 text-slate-400">25/07 11:15</td>
              <td className="p-2.5 font-bold text-white">Marie Dupont (0488 99 88 77)</td>
              <td className="p-2.5">1410 Waterloo</td>
              <td className="p-2.5">Recherche de fuite urgente</td>
              <td className="p-2.5"><span className="bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded font-bold text-[10px]">URGENT FUITE</span></td>
              <td className="p-2.5 text-right">
                <Link href="/admin/devis" className="bg-brand-terracotta text-white px-2.5 py-1 rounded font-bold text-[10px]">
                  Convertir en Devis
                </Link>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

    </div>
  );
}
