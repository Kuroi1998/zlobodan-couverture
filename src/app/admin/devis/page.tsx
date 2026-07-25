"use client";

import React, { useState } from "react";
import { FileText, Plus, Trash2, Download } from "lucide-react";

interface QuoteLine {
  id: string;
  designation: string;
  qty: number;
  unit: string;
  priceHt: number;
  vatRate: number;
}

export default function AdminQuotesPage() {
  const [lines, setLines] = useState<QuoteLine[]>([
    { id: "line-1", designation: "Installation échafaudage de sécurité certifié belges", qty: 1, unit: "forfait", priceHt: 1200.0, vatRate: 6.0 },
    { id: "line-2", designation: "Fourniture & pose ardoises naturelles Cupa clouées", qty: 160, unit: "m²", priceHt: 35.0, vatRate: 6.0 },
  ]);

  const addLine = () => {
    const newLineId = `line-${Date.now()}`;
    setLines([...lines, { id: newLineId, designation: "Nouvelle prestation...", qty: 1, unit: "m²", priceHt: 50.0, vatRate: 6.0 }]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const updateLineField = (id: string, field: keyof QuoteLine, value: string | number) => {
    setLines((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const totalHt = lines.reduce((acc, l) => acc + l.qty * l.priceHt, 0);
  const totalVat = totalHt * 0.06;
  const totalTtc = totalHt + totalVat;

  return (
    <div className="space-y-6">
      <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="space-y-1">
            <h1 className="font-heading font-extrabold text-xl text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-brand-terracotta" />
              <span>Créateur de Devis Officiel #DEV-2026-0013</span>
            </h1>
            <p className="text-xs text-slate-400">
              Composer un devis d'intervention avec TVA Belge 6% (Rénovation logement &gt; 10 ans).
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <span className="inline-block bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded font-bold">
              Brouillon en cours
            </span>
            <p className="text-slate-400">Date : 25/07/2026</p>
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
            {lines.map((l) => (
              <tr key={l.id}>
                <td className="p-2">
                  <input
                    type="text"
                    aria-label={`Désignation pour ${l.designation}`}
                    value={l.designation}
                    onChange={(e) => updateLineField(l.id, "designation", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    aria-label={`Quantité pour ${l.designation}`}
                    value={l.qty}
                    onChange={(e) => updateLineField(l.id, "qty", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="text"
                    aria-label={`Unité pour ${l.designation}`}
                    value={l.unit}
                    onChange={(e) => updateLineField(l.id, "unit", e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-center text-white"
                  />
                </td>
                <td className="p-2">
                  <input
                    type="number"
                    aria-label={`Prix HT pour ${l.designation}`}
                    value={l.priceHt}
                    onChange={(e) => updateLineField(l.id, "priceHt", Number(e.target.value))}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-right text-white"
                  />
                </td>
                <td className="p-2 text-right text-emerald-400 font-bold">6.00%</td>
                <td className="p-2 text-right font-bold text-white">{(l.qty * l.priceHt).toFixed(2)} €</td>
                <td className="p-2 text-center">
                  <button onClick={() => removeLine(l.id)} aria-label={`Supprimer ${l.designation}`} className="text-red-400 hover:text-red-300">
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
