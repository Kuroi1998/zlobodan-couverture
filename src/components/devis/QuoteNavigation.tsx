import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface QuoteNavigationProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void | Promise<void>;
}

/**
 * Navigation entre les étapes.
 *
 * La dernière étape n'affiche pas de bouton « suivant » : elle porte son
 * propre bouton de soumission, dans le formulaire.
 */
export const QuoteNavigation: React.FC<QuoteNavigationProps> = ({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
}) => (
  <div className="flex items-center justify-between pt-6 border-t border-slate-100">
    {currentStep > 1 ? (
      <button
        type="button"
        onClick={onPrevious}
        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition"
      >
        <ChevronLeft className="h-4 w-4" />
        <span>Étape précédente</span>
      </button>
    ) : (
      <div />
    )}

    {currentStep < totalSteps && (
      <button
        type="button"
        onClick={onNext}
        className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
      >
        <span>Continuer vers l&apos;étape {currentStep + 1}</span>
        <ChevronRight className="h-4 w-4" />
      </button>
    )}
  </div>
);
