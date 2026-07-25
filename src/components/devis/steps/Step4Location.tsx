import React from "react";
import { MapPin, CheckCircle2 } from "lucide-react";
import { FormDataState } from "../quote-form.types";

interface Step4Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
  locationStatus: {
    checked: boolean;
    inZone: boolean;
    message: string;
  };
}

export const Step4Location: React.FC<Step4Props> = ({
  formData,
  setFormData,
  locationStatus,
}) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900">
          4. Localisation du chantier
        </h2>
        <p className="text-sm text-slate-600">
          Vérification directe de la faisabilité dans notre zone d'intervention (40km de Bruxelles &amp; Wallonie).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Code Postal Belge *
          </label>
          <div className="relative">
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              placeholder="Ex: 1000, 1410, 1180..."
              maxLength={5}
              className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-terracotta"
            />
            <MapPin className="absolute right-3 top-3.5 h-5 w-5 text-slate-400" />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold text-slate-700 uppercase">
            Commune Belge *
          </label>
          <input
            type="text"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            placeholder="Ex: Bruxelles, Waterloo, Uccle, Wavre..."
            className="w-full bg-slate-50 border border-slate-300 rounded-xl px-4 py-3 text-base text-slate-900 focus:outline-none focus:border-brand-terracotta"
          />
        </div>
      </div>

      {locationStatus.checked && (
        <div
          className={`p-4 rounded-xl text-sm border flex items-center gap-2 ${
            locationStatus.inZone
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span>{locationStatus.message}</span>
        </div>
      )}
    </div>
  );
};
