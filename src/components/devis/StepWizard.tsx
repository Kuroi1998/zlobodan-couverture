"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, AlertTriangle } from "lucide-react";
import { compressImage } from "@/lib/utils/imageCompression";
import { FormDataState } from "./steps/types";
import { Step1Intervention } from "./steps/Step1Intervention";
import { Step2RoofType } from "./steps/Step2RoofType";
import { Step3SurfaceUrgency } from "./steps/Step3SurfaceUrgency";
import { Step4Location } from "./steps/Step4Location";
import { Step5ContactPhoto } from "./steps/Step5ContactPhoto";

export const StepWizard: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedService = searchParams.get("service") || "";

  const [currentStep, setCurrentStep] = useState(1);
  const [photos, setPhotos] = useState<{ file: File; preview: string }[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationStatus, setLocationStatus] = useState<{
    checked: boolean;
    inZone: boolean;
    message: string;
  }>({ checked: false, inZone: true, message: "" });

  const [formData, setFormData] = useState<FormDataState>({
    interventionType: preselectedService || "refection",
    roofType: "ardoise",
    surface: "50-100",
    isUrgent: false,
    postalCode: "1000",
    city: "Bruxelles",
    fullName: "",
    phone: "",
    email: "",
    description: "",
    rgpdConsent: false,
    honeypot: "",
  });

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const selectedFiles = Array.from(e.target.files);

    if (photos.length + selectedFiles.length > 5) {
      setErrorMsg("Vous ne pouvez pas ajouter plus de 5 photos au total.");
      return;
    }

    setIsCompressing(true);
    setErrorMsg("");

    try {
      const compressedList: { file: File; preview: string }[] = [];
      for (const file of selectedFiles) {
        const compressed = await compressImage(file, 1200, 0.8);
        const previewUrl = URL.createObjectURL(compressed);
        compressedList.push({ file: compressed, preview: previewUrl });
      }
      setPhotos((prev) => [...prev, ...compressedList]);
    } catch (err: unknown) {
      console.error("Échec de la compression d'image dans l'assistant de devis :", err);
      setErrorMsg("Erreur lors de la compression de la photo. Veuillez réessayer.");
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos((prev) => prev.filter((_, i) => i !== index));
  };

  const handleNextStep = () => {
    setErrorMsg("");

    if (currentStep === 1 && !formData.interventionType) {
      setErrorMsg("Veuillez sélectionner le type d'intervention souhaité.");
      return;
    }

    if (currentStep === 4) {
      const code = formData.postalCode.trim();
      if (!code || (code.length !== 4 && code.length !== 5)) {
        setErrorMsg("Veuillez saisir un code postal belge valide.");
        return;
      }

      setLocationStatus({
        checked: true,
        inZone: true,
        message: "✅ Votre commune est bien dans notre zone d'intervention sous 24h.",
      });
    }

    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrevStep = () => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (formData.honeypot) {
      router.push("/devis/merci");
      return;
    }

    if (!formData.fullName || !formData.phone || !formData.email) {
      setErrorMsg("Veuillez remplir votre nom, téléphone et adresse email.");
      return;
    }

    if (!formData.rgpdConsent) {
      setErrorMsg("Veuillez accepter le consentement RGPD.");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = new FormData();
      payload.append("interventionType", formData.interventionType);
      payload.append("roofType", formData.roofType);
      payload.append("surface", formData.surface);
      payload.append("isUrgent", formData.isUrgent ? "true" : "false");
      payload.append("postalCode", formData.postalCode);
      payload.append("city", formData.city);
      payload.append("fullName", formData.fullName);
      payload.append("phone", formData.phone);
      payload.append("email", formData.email);

      await fetch("/api/devis", { method: "POST", body: payload });
      router.push("/devis/merci");
    } catch (err: unknown) {
      console.error("Échec de l'envoi de la demande de devis au serveur :", err);
      router.push("/devis/merci");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 sm:p-10 max-w-4xl mx-auto space-y-8">
      <div className="space-y-4">
        <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
          <span>Demande de Devis Gratuit • Étape {currentStep} sur 5</span>
          <span className="text-brand-terracotta">{currentStep * 20}% complété</span>
        </div>

        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5 border border-slate-200">
          <div
            className="h-full bg-gradient-to-r from-brand-terracotta to-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${currentStep * 20}%` }}
          />
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {currentStep === 1 && <Step1Intervention formData={formData} setFormData={setFormData} />}
      {currentStep === 2 && <Step2RoofType formData={formData} setFormData={setFormData} />}
      {currentStep === 3 && <Step3SurfaceUrgency formData={formData} setFormData={setFormData} />}
      {currentStep === 4 && (
        <Step4Location formData={formData} setFormData={setFormData} locationStatus={locationStatus} />
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

      <div className="flex items-center justify-between pt-6 border-t border-slate-100">
        {currentStep > 1 ? (
          <button
            type="button"
            onClick={handlePrevStep}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-sm hover:bg-slate-100 transition"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>Étape précédente</span>
          </button>
        ) : <div />}

        {currentStep < 5 && (
          <button
            type="button"
            onClick={handleNextStep}
            className="flex items-center gap-1.5 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
          >
            <span>Continuer vers l'étape {currentStep + 1}</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
