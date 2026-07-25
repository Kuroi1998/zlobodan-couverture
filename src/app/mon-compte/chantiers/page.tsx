import React from "react";
import Image from "next/image";
import { HardHat, Calendar, CheckCircle2, Download, ShieldCheck, Camera } from "lucide-react";

export default function ClientProjectsPage() {
  const projectData = {
    title: "Réfection intégrale toiture mansardée en ardoises naturelle Cupa",
    address: "Avenue Louise 14, 1050 Ixelles (Bruxelles)",
    roofType: "Ardoise naturelle clouée",
    status: "in_progress",
    startDate: "20/07/2026",
    endDatePlanned: "05/08/2026",
    milestones: [
      { step: 1, label: "Échafaudage & Sécurisation", status: "completed", date: "20/07/2026" },
      { step: 2, label: "Dépose ancienne couverture & Charpente", status: "completed", date: "22/07/2026" },
      { step: 3, label: "Pose Sous-toiture HPV & Voligeage", status: "completed", date: "24/07/2026" },
      { step: 4, label: "Pose des Ardoises & Crochets Inox", status: "in_progress", date: "En cours" },
      { step: 5, label: "Zinguerie sur mesure & Gouttières", status: "planned", date: "Prévu 29/07" },
      { step: 6, label: "Réception de chantier & Attestation Décennale", status: "planned", date: "Prévu 05/08" },
    ],
    photos: [
      { type: "Avant", title: "État initial de l'ancienne toiture", src: "/images/chantiers/before-after-01.webp" },
      { type: "Pendant", title: "Pose sous-toiture HPV Doerken", src: "/images/chantiers/chantier-02.webp" },
      { type: "Pendant", title: "Lattage et alignement ardoises", src: "/images/chantiers/chantier-01.webp" },
    ],
    documents: [
      { name: "Attestation Garantie Décennale Belge AXA (Police #AXA-BE-84920139)", size: "1.2 Mo", type: "PDF" },
      { name: "Fiche Technique Ardoises Cupa Pizzaras & Certificat NBN", size: "850 Ko", type: "PDF" },
    ],
  };

  return (
    <div className="space-y-8">
      
      {/* Header */}
      <div>
        <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-white">
          Suivi de Chantier en Direct
        </h1>
        <p className="text-sm text-slate-400">
          Suivez quotidiennement les étapes d'avancement de vos travaux et accédez à la galerie photos et aux attestations de fin de chantier.
        </p>
      </div>

      {/* Main Project Overview */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div className="space-y-1">
            <span className="text-xs font-bold text-brand-terracotta uppercase">Chantier #BE-IXELLES-01</span>
            <h2 className="font-heading font-extrabold text-xl text-white">
              {projectData.title}
            </h2>
            <p className="text-xs text-slate-400">{projectData.address}</p>
          </div>
          <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 px-4 py-1.5 rounded-full text-xs font-bold self-start md:self-auto">
            • Chantier en cours d'exécution
          </span>
        </div>

        {/* Milestone Steps Timeline */}
        <div className="space-y-4">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <HardHat className="h-5 w-5 text-amber-400" />
            <span>Étapes d'Avancement</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projectData.milestones.map((m) => (
              <div
                key={m.step}
                className={`p-4 rounded-2xl border text-xs space-y-2 ${
                  m.status === "completed"
                    ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-200"
                    : m.status === "in_progress"
                    ? "bg-brand-terracotta/10 border-brand-terracotta/40 text-orange-200 shadow-md"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>Étape {m.step}</span>
                  {m.status === "completed" ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <span className="text-[10px] text-slate-400">{m.date}</span>
                  )}
                </div>
                <p className="font-medium text-white">{m.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Photo Gallery (Avant / Pendant / Après) */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <Camera className="h-5 w-5 text-brand-terracotta" />
            <span>Galerie Photos du Chantier</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {projectData.photos.map((p, idx) => (
              <div key={idx} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden space-y-2">
                <div className="relative h-44 w-full">
                  <Image src={p.src} alt={p.title} fill className="object-cover" />
                  <span className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-md px-2.5 py-0.5 rounded text-[10px] font-bold text-white border border-slate-700">
                    {p.type}
                  </span>
                </div>
                <p className="p-3 text-xs text-slate-300 font-medium line-clamp-1">{p.title}</p>
              </div>
            ))}
          </div>
        </div>

        {/* End of Construction Documents */}
        <div className="space-y-4 pt-4 border-t border-slate-800">
          <h3 className="font-heading font-bold text-base text-white flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
            <span>Documents de Remplacement &amp; Garantie Décennale</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {projectData.documents.map((d, i) => (
              <div key={i} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <p className="font-bold text-white">{d.name}</p>
                  <p className="text-slate-400">{d.size} • Format {d.type}</p>
                </div>
                <button className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white transition">
                  <Download className="h-4 w-4 text-brand-terracotta" />
                </button>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
