"use client";

import React, { useState } from "react";
import { Receipt, Download } from "lucide-react";

export default function AdminInvoicesPage() {
  const [invoices] = useState([
    { number: "FACT-2026-0004", quote: "DEV-2026-0012", client: "M. Jean Peeters", amountTtc: 4850.0, status: "issued", date: "24/07/2026" },
    { number: "FACT-2026-0003", quote: "DEV-2026-0008", client: "Mme Marie Dupont", amountTtc: 1250.0, status: "paid", date: "15/07/2026" },
    { number: "FACT-2026-0002", quote: "DEV-2026-0005", client: "Société Sprl Brabant", amountTtc: 8900.0, status: "paid", date: "02/06/2026" },
  ]);

  return (
    <div className="space-y-6">
      
      <div>
        <h1 className="font-bold text-lg text-white">Facturation Immuable (Back-Office)</h1>
        <p className="text-slate-400">Conversion des devis acceptés en factures séquentielles sans trou. Toute modification requiert la création d'un avoir.</p>
      </div>

      {/* Conversion Banner */}
      <div className="bg-slate-950 border border-slate-800 p-4 rounded flex items-center justify-between">
        <div>
          <span className="text-emerald-400 font-bold">Devis Accepté : DEV-2026-0012 (Jean Peeters)</span>
          <p className="text-slate-400 text-[11px]">Prêt pour la génération de la facture d'acompte (30%)</p>
        </div>

        <button
          onClick={() => alert("Facture immuable FACT-2026-0005 générée avec succès et transmise au client.")}
          className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-4 py-2 rounded text-xs flex items-center gap-1.5"
        >
          <Receipt className="h-4 w-4" />
          <span>Convertir en Facture Immuable (FACT-2026-0005)</span>
        </button>
      </div>

      {/* Invoices List Table */}
      <div className="bg-slate-950 border border-slate-800 rounded p-4 space-y-3">
        <h2 className="font-bold text-sm text-white">Registre des Factures Émises</h2>

        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-2.5 border-b border-slate-800">N° Facture</th>
              <th className="p-2.5 border-b border-slate-800">Devis Origine</th>
              <th className="p-2.5 border-b border-slate-800">Client</th>
              <th className="p-2.5 border-b border-slate-800">Émission</th>
              <th className="p-2.5 border-b border-slate-800 text-right">Montant TTC</th>
              <th className="p-2.5 border-b border-slate-800 text-center">Statut</th>
              <th className="p-2.5 border-b border-slate-800 text-right">PDF</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {invoices.map((inv) => (
              <tr key={inv.number} className="hover:bg-slate-900/50">
                <td className="p-2.5 font-bold text-white">{inv.number}</td>
                <td className="p-2.5 text-slate-400">{inv.quote}</td>
                <td className="p-2.5 font-bold text-white">{inv.client}</td>
                <td className="p-2.5 text-slate-400">{inv.date}</td>
                <td className="p-2.5 text-right font-bold text-white">{inv.amountTtc.toFixed(2)} €</td>
                <td className="p-2.5 text-center">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${inv.status === "paid" ? "bg-emerald-950 text-emerald-400" : "bg-amber-950 text-amber-300"}`}>
                    {inv.status === "paid" ? "PAYÉE" : "ÉMISE (À ENCAISSER)"}
                  </span>
                </td>
                <td className="p-2.5 text-right">
                  <a
                    href={`/api/pdf/invoice/${inv.number}`}
                    target="_blank"
                    rel="noreferrer"
                    className="bg-slate-900 border border-slate-800 text-white px-2.5 py-1 rounded text-[10px] font-bold"
                  >
                    Voir PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
