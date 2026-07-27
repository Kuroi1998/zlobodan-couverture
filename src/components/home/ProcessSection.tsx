import React from "react";
import { PhoneCall, SearchCheck, FileCheck2, Hammer } from "lucide-react";

export const ProcessSection: React.FC = () => {
  const steps = [
    {
      number: "01",
      icon: <PhoneCall className="h-6 w-6 text-brand-terracotta" />,
      title: "Contact & Premier Échange",
      description: "Prise de contact par téléphone ou formulaire. Qualification de votre besoin (urgence fuite, réfection complète, démoussage)."
    },
    {
      number: "02",
      icon: <SearchCheck className="h-6 w-6 text-amber-500" />,
      title: "Visite & Diagnostic Gratuit",
      description: "Déplacement sur place pour inspecter la toiture, le faîtage, les voliges et les gouttières. Le rendez-vous est convenu avec vous."
    },
    {
      number: "03",
      icon: <FileCheck2 className="h-6 w-6 text-blue-500" />,
      title: "Devis Clair & Sans Surprise",
      description: "Remise d'un devis détaillé : fournitures, main-d'œuvre et calendrier prévisionnel, poste par poste."
    },
    {
      number: "04",
      icon: <Hammer className="h-6 w-6 text-emerald-500" />,
      title: "Chantier & Réception des Travaux",
      description: "Exécution des travaux dans le respect des règles de sécurité, nettoyage quotidien du site et procès-verbal de réception signé."
    }
  ];

  return (
    <section className="py-20 bg-slate-900 text-white border-y border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-3xl mx-auto space-y-4 mb-16">
          <span className="inline-block bg-slate-800 text-brand-terracotta text-xs font-extrabold uppercase tracking-widest px-3.5 py-1 rounded-full border border-slate-700">
            Méthode & Sérénité
          </span>
          <h2 className="font-heading font-extrabold text-3xl sm:text-4xl text-white tracking-tight">
            Comment se déroule votre projet de toiture ?
          </h2>
          <p className="text-base text-slate-400">
            Un accompagnement transparent de A à Z sans mauvaise surprise ni frais cachés.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((st, i) => (
            <div
              key={st.number}
              className="relative bg-slate-950/80 border border-slate-800 p-6 rounded-2xl space-y-4 hover:border-slate-700 transition"
            >
              <div className="flex items-center justify-between">
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                  {st.icon}
                </div>
                <span className="font-heading font-extrabold text-3xl text-slate-700">
                  {st.number}
                </span>
              </div>

              <h3 className="font-heading font-bold text-lg text-white">
                {st.title}
              </h3>

              <p className="text-xs text-slate-400 leading-relaxed">
                {st.description}
              </p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
};
