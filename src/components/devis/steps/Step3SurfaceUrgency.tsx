import React from "react";
import { AlertTriangle } from "lucide-react";
import { FormDataState } from "../quote-form.types";
import { SURFACE_OPTIONS } from "@/domain/quote-options";

interface Step3Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
}

export const Step3SurfaceUrgency: React.FC<Step3Props> = ({ formData, setFormData }) => {
  const surfaceOptions = SURFACE_OPTIONS.map((o) => ({
    id: o.id,
    label: o.label,
    desc: o.hint ?? "",
  }));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900">
          3. Surface approximative &amp; Degré d'urgence
        </h2>
        <p className="text-sm text-slate-600">
          Estimation indicative pour adapter l'équipe d'intervention.
        </p>
      </div>

      <div className="space-y-3">
        <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider">
          Surface estimée au sol / toiture :
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {surfaceOptions.map((opt) => {
            const isSelected = formData.surface === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData({ ...formData, surface: opt.id })}
                className={`p-4 rounded-xl border-2 text-left space-y-1 transition ${
                  isSelected
                    ? "border-brand-terracotta bg-orange-50/50 shadow"
                    : "border-slate-200 hover:border-slate-300"
                }`}
              >
                <p className="font-heading font-bold text-sm text-slate-900">{opt.label}</p>
                <p className="text-[11px] text-slate-500">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Emergency Selector */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <span className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          <span>S'agit-il d'une fuite active d'urgence ?</span>
        </span>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isUrgent: false })}
            className={`p-4 rounded-xl border-2 text-center font-bold text-sm transition ${
              !formData.isUrgent
                ? "border-slate-800 bg-slate-900 text-white"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Non - Projet classique
          </button>
          <button
            type="button"
            onClick={() => setFormData({ ...formData, isUrgent: true })}
            className={`p-4 rounded-xl border-2 text-center font-bold text-sm transition flex items-center justify-center gap-2 ${
              formData.isUrgent
                ? "border-red-600 bg-red-600 text-white shadow-lg animate-pulse"
                : "border-red-200 text-red-700 hover:bg-red-50"
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Oui, c&apos;est urgent</span>
          </button>
        </div>
      </div>
    </div>
  );
};
