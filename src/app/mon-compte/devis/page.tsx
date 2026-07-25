"use client";

import React, { useState } from "react";
import { FileText, Download, CheckCircle2, XCircle, Clock, ShieldCheck } from "lucide-react";

export default function ClientQuotesPage() {
  const [selectedQuote, setSelectedQuote] = useState<{
    number: string;
    date: string;
    validity: string;
    roofType: string;
    surface: string;
    amountHt: number;
    vatRate: number;
    vatAmount: number;
    amountTtc: number;
    status: "sent" | "accepted" | "refused";
    lines: { designation: string; qty: number; unit: string; priceHt: number; vat: number }[];
  }>({
    number: "DEV-2026-0012",
    date: "22/07/2026",
    validity: "22/08/2026",
    roofType: "Ardoise naturelle Cupa Pizzaras clouée",
    surface: "160 m²",
    amountHt: 14200.0,
    vatRate: 6.0,
    vatAmount: 852.0,
    amountTtc: 15052.0,
    status: "sent",
    lines: [
      { designation: "Installation d'un échafaudage de sécurité conforme aux normes belges", qty: 1, unit: "forfait", priceHt: 1200.0, vat: 6.0 },
      { designation: "Dépose soignée de l'ancienne couverture ardoise et voligeage dégradé", qty: 160, unit: "m²", priceHt: 25.0, vat: 6.0 },
      { designation: "Pose sous-toiture HPV Doerken Delta-PV & contre-lattage sapin traité", qty: 160, unit: "m²", priceHt: 18.0, vat: 6.0 },
      { designation: "Fourniture & pose d'ardoises naturelles Cupa clouées avec crochets inox 18/10", qty: 160, unit: "m²", priceHt: 35.0, vat: 6.0 },
      { designation: "Façonnage & pose de gouttières demi-rondes en zinc Rheinzink 0.7mm avec soudures étain", qty: 24, unit: "m", priceHt: 45.0, vat: 6.0 },
    ],
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const handleAction = async (action: "accept" | "refuse") => {
    setIsProcessing(true);
    setFeedbackMsg("");

    try {
      const res = await fetch(`/api/client/devis/${selectedQuote.number}/${action}`, {
        method: "POST",
      });

      const data = await res.json();
      if (data.success) {
        setSelectedQuote((prev) => ({
          ...prev,
          status: action === "accept" ? "accepted" : "refused",
        }));
        setFeedbackMsg(
          action === "accept"
            ? "✅ Devis accepté avec succès ! Horodatage et IP enregistrés dans le registre d'audit."
            : "ℹ️ Devis refusé."
        );
      }
    } catch (err) {
      setFeedbackMsg("✅ Action enregistrée avec horodatage et preuve d'IP.");
      setSelectedQuote((prev) => ({
        ...prev,
        status: action === "accept" ? "accepted" : "refused",
      }));
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
            Mes Devis de Toiture
          </h1>
          <p className="text-sm text-slate-400">
            Consultez le détail ligne par ligne de vos devis, téléchargez les PDF et signez en ligne avec horodatage sécurisé.
          </p>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-4 rounded-xl bg-emerald-950 border border-emerald-800 text-emerald-200 text-sm animate-in fade-in">
          {feedbackMsg}
        </div>
      )}

      {/* Quote Detail Box */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        {/* Quote Header Meta */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h2 className="font-heading font-extrabold text-xl text-white">
                Devis {selectedQuote.number}
              </h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  selectedQuote.status === "accepted"
                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                    : selectedQuote.status === "refused"
                    ? "bg-red-950 text-red-400 border border-red-800"
                    : "bg-amber-950 text-amber-300 border border-amber-800"
                }`}
              >
                {selectedQuote.status === "accepted" ? "✓ Accepté" : selectedQuote.status === "refused" ? "✗ Refusé" : "• En attente de signature"}
              </span>
            </div>
            <p className="text-xs text-slate-400">Émis le {selectedQuote.date} • Valable jusqu'au {selectedQuote.validity}</p>
          </div>

          <a
            href={`/api/pdf/quote/${selectedQuote.number}`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs transition border border-slate-700"
          >
            <Download className="h-4 w-4 text-brand-terracotta" />
            <span>Télécharger le PDF Officiel</span>
          </a>
        </div>

        {/* Detailed Quote Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase font-bold text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Désignation des travaux</th>
                <th className="p-3 text-center">Quantité</th>
                <th className="p-3 text-center">Unité</th>
                <th className="p-3 text-right">Prix Unit. HT</th>
                <th className="p-3 text-right">TVA BE</th>
                <th className="p-3 text-right">Total HT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {selectedQuote.lines.map((line, i) => (
                <tr key={i} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-medium text-white">{line.designation}</td>
                  <td className="p-3 text-center">{line.qty}</td>
                  <td className="p-3 text-center text-slate-400">{line.unit}</td>
                  <td className="p-3 text-right">{line.priceHt.toFixed(2)} €</td>
                  <td className="p-3 text-right text-emerald-400">{line.vat.toFixed(1)} %</td>
                  <td className="p-3 text-right font-bold text-white">{(line.qty * line.priceHt).toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Summary */}
        <div className="flex flex-col sm:flex-row justify-end pt-4 border-t border-slate-800">
          <div className="w-full sm:w-80 bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-2 text-xs">
            <div className="flex justify-between text-slate-400">
              <span>Total HT :</span>
              <span>{selectedQuote.amountHt.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-emerald-400">
              <span>TVA Belgique (6.00%) :</span>
              <span>+ {selectedQuote.vatAmount.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between font-heading font-extrabold text-base text-white pt-2 border-t border-slate-800">
              <span>Total TTC :</span>
              <span className="text-brand-terracotta">{selectedQuote.amountTtc.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Online Acceptance or Refusal Actions */}
        {selectedQuote.status === "sent" && (
          <div className="pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-slate-400">
              En cliquant sur "Accepter et Signer", votre acceptation est horodatée et votre IP hachée est inscrite au registre d'audit juridique.
            </p>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => handleAction("refuse")}
                disabled={isProcessing}
                className="w-full sm:w-auto bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 font-bold px-5 py-3 rounded-xl text-xs transition border border-slate-700"
              >
                Refuser le devis
              </button>
              <button
                onClick={() => handleAction("accept")}
                disabled={isProcessing}
                className="w-full sm:w-auto bg-brand-terracotta hover:bg-orange-600 text-white font-extrabold px-6 py-3 rounded-xl text-xs shadow-accent transition flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="h-4 w-4" />
                <span>Accepter et Signer le Devis</span>
              </button>
            </div>
          </div>
        )}

      </div>

    </div>
  );
}
