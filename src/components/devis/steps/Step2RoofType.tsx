import React from "react";
import { CheckCircle2 } from "lucide-react";
import { FormDataState } from "./types";

interface Step2Props {
  formData: FormDataState;
  setFormData: React.Dispatch<React.SetStateAction<FormDataState>>;
}

export const Step2RoofType: React.FC<Step2Props> = ({ formData, setFormData }) => {
  const roofTypeOptions = [
    { id: "ardoise", title: "Ardoise naturelle / synthétique", subtitle: "Fréquent en Belgique & Région bruxelloise" },
    { id: "tuile_terre_cuite", title: "Tuiles terre cuite Koramic / Pottelberg", subtitle: "Plates, romanes ou emboîtement" },
    { id: "tuile_beton", title: "Tuiles béton", subtitle: "Gris/Rouge massif" },
    { id: "zinc", title: "Zinc à joint debout", subtitle: "Toiture mansardée ou moderne" },
    { id: "bac_acier", title: "Bac acier", subtitle: "Entrepôts ou annexes" },
    { id: "je_ne_sais_pas", title: "Je ne sais pas", subtitle: "À diagnostiquer sur place par le couvreur" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-heading font-extrabold text-2xl text-slate-900">
          2. Quel est le matériau de votre toiture ?
        </h2>
        <p className="text-sm text-slate-600">
          Permet à notre métreur d'anticiper le matériel spécifique à prévoir.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {roofTypeOptions.map((opt) => {
          const isSelected = formData.roofType === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setFormData({ ...formData, roofType: opt.id })}
              className={`p-5 rounded-2xl border-2 text-left flex items-start gap-4 transition-all ${
                isSelected
                  ? "border-brand-terracotta bg-orange-50/50 shadow-md"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="flex-1 space-y-1">
                <h3 className="font-heading font-bold text-base text-slate-900">
                  {opt.title}
                </h3>
                <p className="text-xs text-slate-500">{opt.subtitle}</p>
              </div>
              {isSelected && <CheckCircle2 className="h-6 w-6 text-brand-terracotta shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
