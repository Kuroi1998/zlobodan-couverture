import React from "react";
import { Home, Droplets, Sparkles, ShieldAlert, Flame, Sun, HelpCircle, CheckCircle2 } from "lucide-react";
import { FormDataState } from "../quote-form.types";
import { INTERVENTION_OPTIONS } from "@/domain/quote-options";

interface Step1Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
}

export const Step1Intervention: React.FC<Step1Props> = ({ formData, setFormData }) => {
  // Les identifiants et libelles viennent de , partages
  // avec la validation serveur. Seules les icones restent une affaire de rendu.
  const ICONS: Record<string, React.ReactNode> = {
    refection: <Home className="h-6 w-6 text-brand-terracotta" />,
    fuite: <Droplets className="h-6 w-6 text-blue-500" />,
    demoussage: <Sparkles className="h-6 w-6 text-amber-500" />,
    gouttieres: <ShieldAlert className="h-6 w-6 text-emerald-500" />,
    isolation: <Flame className="h-6 w-6 text-orange-500" />,
    velux: <Sun className="h-6 w-6 text-yellow-400" />,
    autre: <HelpCircle className="h-6 w-6 text-slate-400" />,
  };

  const interventionOptions = INTERVENTION_OPTIONS.map((o) => ({
    id: o.id,
    title: o.label,
    icon: ICONS[o.id],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900">
          1. Quel est le type d'intervention souhaité ?
        </h2>
        <p className="text-sm text-slate-600">
          Sélectionnez la prestation principale correspondant à votre besoin.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {interventionOptions.map((opt) => {
          const isSelected = formData.interventionType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormData({ ...formData, interventionType: opt.id })}
              className={`p-5 rounded-2xl border-2 text-left flex items-center gap-4 transition-all duration-200 ${
                isSelected
                  ? "border-brand-terracotta bg-orange-50/50 shadow-md ring-2 ring-brand-terracotta/20"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                {opt.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-base text-slate-900">
                  {opt.title}
                </h3>
              </div>
              {isSelected && <CheckCircle2 className="h-6 w-6 text-brand-terracotta shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
