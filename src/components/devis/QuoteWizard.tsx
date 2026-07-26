"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useQuoteWizard } from "./useQuoteWizard";
import { QuoteProgress } from "./QuoteProgress";
import { QuoteNavigation } from "./QuoteNavigation";
import { Step1Intervention } from "./steps/Step1Intervention";
import { Step2RoofType } from "./steps/Step2RoofType";
import { Step3SurfaceUrgency } from "./steps/Step3SurfaceUrgency";
import { Step4Location } from "./steps/Step4Location";
import { Step5ContactPhoto } from "./steps/Step5ContactPhoto";

/**
 * Assistant de demande de devis en cinq étapes.
 *
 * Ce composant n'est plus responsable que de l'assemblage : la progression, la
 * navigation et l'étape courante sont des composants dédiés, et tout l'état
 * vit dans `useQuoteWizard`. Auparavant un seul fichier portait la navigation,
 * la compression d'images, la validation, l'envoi réseau et le rendu — soit
 * cinq raisons de changer pour un même fichier.
 */
export const QuoteWizard: React.FC = () => {
  const {
    currentStep,
    totalSteps,
    formData,
    setFormData,
    photos,
    isCompressing,
    isSubmitting,
    draftId,
    draftReference,
    errorMsg,
    locationStatus,
    handlePhotoUpload,
    removePhoto,
    goToNextStep,
    goToPreviousStep,
    deleteDraft,
    handleSubmit,
  } = useQuoteWizard();

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      <QuoteProgress currentStep={currentStep} totalSteps={totalSteps} />

      {draftId && (
        <div className="flex flex-col justify-between gap-2 rounded-xl border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900 sm:flex-row sm:items-center">
          <span>Brouillon serveur enregistré · {draftReference}</span>
          <button
            type="button"
            onClick={() => void deleteDraft()}
            className="font-bold text-red-700 hover:underline"
          >
            Supprimer le brouillon
          </button>
        </div>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-in fade-in"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {currentStep === 1 && <Step1Intervention formData={formData} setFormData={setFormData} />}
      {currentStep === 2 && <Step2RoofType formData={formData} setFormData={setFormData} />}
      {currentStep === 3 && <Step3SurfaceUrgency formData={formData} setFormData={setFormData} />}
      {currentStep === 4 && (
        <Step4Location
          formData={formData}
          setFormData={setFormData}
          locationStatus={locationStatus}
        />
      )}
      {currentStep === 5 && (
        <Step5ContactPhoto
          formData={formData}
          setFormData={setFormData}
          photos={photos}
          handlePhotoUpload={handlePhotoUpload}
          removePhoto={removePhoto}
          handleSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          isCompressing={isCompressing}
        />
      )}

      <QuoteNavigation
        currentStep={currentStep}
        totalSteps={totalSteps}
        onPrevious={goToPreviousStep}
        onNext={goToNextStep}
      />
    </div>
  );
};
