"use client";

import React, { useState } from "react";
import { FileText, Plus, Trash2, Download, CheckCircle2 } from "lucide-react";

export default function AdminQuotesPage() {
  const [lines, setLines] = useState([
    { designation: "Installation échafaudage de sécurité certifié belges", qty: 1, unit: "forfait", priceHt: 1200.0, vatRate: 6.0 },
    { designation: "Fourniture & pose ardoises naturelles Cupa clouées", qty: 160, unit: "m²", priceHt: 35.0, vatRate: 6.0 },
  ]);

  const addLine = () => {
    setLines([...lines, { designation: "Nouvelle prestation...", qty: 1, unit: "m²", priceHt: 50.0, vatRate: 6.0 }]);
  };

  const removeLine = (idx: number) => {
    setLines(lines.filter((_, i) => i !== idx));
  };

  const totalHt = lines.reduce((acc, l) => acc + l.qty * l.priceHt, 0);
  const totalVat = totalHt * 0.06;
  const totalTtc = totalHt + totalVat;

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="font-bold text-lg text-white">Création &amp; Génération de Devis (Back-Office)</h1>
        <p className="text-slate-400">Composez le devis ligne par ligne et calculez automatiquement les montants HT, TVA 6.00% et TTC.</p>
      </div>

      {/* Quote Composer Form */}
      <div className="bg-slate-950 border border-slate-800 rounded p-6 space-y-4">
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-b border-slate-800 pb-4">
          <div>
            <label className="text-slate-400 uppercase text-[10px]">Client Destinataire</label>
            <input type="text" defaultValue="M. Jean Peeters" className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
          </div>
          <div>
            <label className="text-slate-400 uppercase text-[10px]">Adresse du Chantier</label>
            <input type="text" defaultValue="Avenue Louise 14, 1050 Ixelles" className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-white" />
          </div>
          <div>
            <label className="text-slate-400 uppercase text-[10px]">Numéro de Devis</label>
            <input type="text" defaultValue="DEV-2026-0013" readOnly className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-slate-400 font-bold" />
          </div>
        </div>

        {/* Lines Table */}
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-900 text-slate-400 uppercase text-[10px]">
            <tr>
              <th className="p-2">Désignation</th>
              <th className="p-2 w-20 text-center">Qté</th>
              <th className="p-2 w-24 text-center">Unité</th>
              <th className="p-2 w-32 text-right">Prix HT (€)</th>
              <th className="p-2 w-20 text-right">TVA (%)</th>
              <th className="p-2 w-32 text-right">Total HT</th>
              <th className="p-2 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {lines.map((l, i) => (
              <tr key={i}>
                <td className="p-2">
                  <input
                    type="text"
                    value={l.designation}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[i].designation = e.target.value;
                      setLines(updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={l.qty}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[i].qty = Number(e.target.value);
                      setLines(updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    value={l.unit}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[i].unit = e.target.value;
                      setLines(updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    value={l.priceHt}
                    onChange={(e) => {
                      const updated = [...lines];
                      updated[i].priceHt = Number(e.target.value);
                      setLines(updated);
                    }}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-right text-white"
                  />
                </td>
                <td className="p-2 text-right text-emerald-400 font-bold">6.00%</td>
                <td className="p-2 text-right font-bold text-white">{(l.qty * l.priceHt).toFixed(2)} €</td>
                <td className="p-2 text-center">
                  <button onClick={() => removeLine(i)} className="text-red-400 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <button onClick={addLine} className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-3 py-1.5 rounded font-bold text-xs flex items-center gap-1 border border-slate-800">
          <Plus className="h-3.5 w-3.5" />
          <span>Ajouter une ligne</span>
        </button>

        {/* Totals & Export Button */}
        <div className="flex justify-between items-end pt-4 border-t border-slate-800">
          <a
            href="/api/pdf/quote/DEV-2026-0013"
            target="_blank"
            rel="noreferrer"
            className="bg-brand-terracotta hover:bg-orange-600 text-white font-bold px-4 py-2.5 rounded flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            <span>Générer le Devis PDF Officiel</span>
          </a>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded w-72 space-y-1 text-right">
            <div><span className="text-slate-400">Total HT :</span> <strong className="text-white">{totalHt.toFixed(2)} €</strong></div>
            <div><span className="text-emerald-400">TVA BE 6.00% :</span> <strong className="text-emerald-400">+ {totalVat.toFixed(2)} €</strong></div>
            <div className="text-sm font-bold border-t border-slate-800 pt-1 text-brand-terracotta">
              <span>Total TTC :</span> <span>{totalTtc.toFixed(2)} €</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
