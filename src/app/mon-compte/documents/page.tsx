import React from "react";
import { FolderOpen, Download, FileText, ShieldCheck, Camera } from "lucide-react";

export default function ClientDocumentsPage() {
  const documentsList = [
    {
      name: "Attestation Garantie Décennale Belge AXA 2026",
      type: "Garantie Décennale",
      size: "1.4 Mo",
      date: "20/07/2026",
      format: "PDF",
      icon: <ShieldCheck className="h-5 w-5 text-emerald-400" />,
    },
    {
      name: "Devis Officiel Signé #DEV-2026-0012",
      type: "Devis",
      size: "620 Ko",
      date: "22/07/2026",
      format: "PDF",
      icon: <FileText className="h-5 w-5 text-brand-terracotta" />,
    },
    {
      name: "Facture d'acompte #FACT-2026-0004",
      type: "Facture Immuable",
      size: "450 Ko",
      date: "24/07/2026",
      format: "PDF",
      icon: <FileText className="h-5 w-5 text-blue-400" />,
    },
    {
      name: "Dossier Technique Fiches Produits Cupa & Doerken",
      type: "Fiche Technique",
      size: "3.2 Mo",
      date: "20/07/2026",
      format: "PDF",
      icon: <FolderOpen className="h-5 w-5 text-teal-400" />,
    },
  ];

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Mes Documents &amp; Attestations
        </h1>
        <p className="text-sm text-slate-400">
          Retrouvez tous les documents officiels rattachés à votre compte : devis signés, factures immuables, attestation de garantie décennale AXA et fiches techniques.
        </p>
      </div>

      {/* Documents List Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {documentsList.map((doc, idx) => (
          <div
            key={idx}
            className="bg-slate-900 border border-slate-800 p-5 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-700 transition"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 shrink-0">
                {doc.icon}
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase">{doc.type}</span>
                <h3 className="font-heading font-bold text-sm text-white line-clamp-1">{doc.name}</h3>
                <p className="text-[11px] text-slate-500">{doc.date} • {doc.size}</p>
              </div>
            </div>

            <button className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition shrink-0">
              <Download className="h-4 w-4 text-brand-terracotta" />
            </button>
          </div>
        ))}
      </div>

    </div>
  );
}
