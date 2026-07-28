import React from "react";

interface QuoteProgressProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Barre de progression de l'assistant de devis.
 *
 * Purement présentationnel et sans état : rendu côté serveur, il n'ajoute
 * aucun JavaScript au navigateur.
 */
export const QuoteProgress: React.FC<QuoteProgressProps> = ({ currentStep, totalSteps }) => {
  const percentage = Math.round((currentStep / totalSteps) * 100);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
        <span>
          Demande de Devis Gratuit • Étape {currentStep} sur {totalSteps}
        </span>
        <span className="text-brand-terracotta">{percentage}% complété</span>
      </div>

      <div
        className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200"
        role="progressbar"
        aria-valuenow={percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Progression : étape ${currentStep} sur ${totalSteps}`}
      >
        <div
          className="h-full bg-gradient-to-r from-brand-terracotta to-amber-500 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
