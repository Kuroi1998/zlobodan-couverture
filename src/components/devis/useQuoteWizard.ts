"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/media/image-compression";
import { QUOTE_DEFAULTS } from "@/domain/quote-options";
import type { FormDataState } from "./quote-form.types";

/**
 * État et logique de l'assistant de devis.
 *
 * Extrait de `StepWizard`, qui mêlait navigation entre étapes, compression
 * d'images, validation et envoi réseau au rendu. Le composant ne garde que
 * l'affichage ; tout ce qui se teste sans DOM vit ici.
 */

const MAX_PHOTOS = 5;
const TOTAL_STEPS = 5;
const COMPRESSION_MAX_WIDTH = 1200;
const COMPRESSION_QUALITY = 0.8;

export interface PhotoAttachment {
  file: File;
  preview: string;
}

export interface LocationStatus {
  checked: boolean;
  inZone: boolean;
  message: string;
}

function buildInitialFormData(preselectedService: string): FormDataState {
  return {
    // La valeur pré-sélectionnée vient de l'URL : elle n'est retenue que si
    // elle correspond à une intervention connue, sinon on retombe sur le défaut.
    interventionType: preselectedService || QUOTE_DEFAULTS.interventionType,
    roofType: QUOTE_DEFAULTS.roofType,
    surface: QUOTE_DEFAULTS.surface,
    isUrgent: false,
    postalCode: "1000",
    city: "Bruxelles",
    fullName: "",
    phone: "",
    email: "",
    description: "",
    rgpdConsent: false,
    honeypot: "",
  };
}

export function useQuoteWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [currentStep, setCurrentStep] = useState(1);
  const [photos, setPhotos] = useState<PhotoAttachment[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [locationStatus, setLocationStatus] = useState<LocationStatus>({
    checked: false,
    inZone: true,
    message: "",
  });

  const [formData, setFormData] = useState<FormDataState>(() =>
    buildInitialFormData(searchParams.get("service") ?? "")
  );

  const handlePhotoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;
      const selectedFiles = Array.from(e.target.files);

      if (photos.length + selectedFiles.length > MAX_PHOTOS) {
        setErrorMsg(`Vous ne pouvez pas ajouter plus de ${MAX_PHOTOS} photos au total.`);
        return;
      }

      setIsCompressing(true);
      setErrorMsg("");

      try {
        const compressed: PhotoAttachment[] = [];
        for (const file of selectedFiles) {
          const result = await compressImage(file, COMPRESSION_MAX_WIDTH, COMPRESSION_QUALITY);
          compressed.push({ file: result, preview: URL.createObjectURL(result) });
        }
        setPhotos((prev) => [...prev, ...compressed]);
      } catch (err: unknown) {
        console.error("Échec de la compression d'image :", err);
        setErrorMsg("Erreur lors de la compression de la photo. Veuillez réessayer.");
      } finally {
        setIsCompressing(false);
      }
    },
    [photos.length]
  );

  const removePhoto = useCallback((index: number) => {
    setPhotos((prev) => {
      // L'URL d'objet est révoquée : sans cela, chaque retrait laisse fuir la
      // mémoire du blob jusqu'au rechargement de la page.
      const target = prev[index];
      if (target) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const goToNextStep = useCallback(() => {
    setErrorMsg("");

    if (currentStep === 1 && !formData.interventionType) {
      setErrorMsg("Veuillez sélectionner le type d'intervention souhaité.");
      return;
    }

    if (currentStep === 4) {
      const code = formData.postalCode.trim();
      if (!/^[1-9]\d{3}$/.test(code)) {
        setErrorMsg("Veuillez saisir un code postal belge valide (4 chiffres).");
        return;
      }
      setLocationStatus({
        checked: true,
        inZone: true,
        message: "Votre commune est bien dans notre zone d'intervention sous 24 h.",
      });
    }

    setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  }, [currentStep, formData.interventionType, formData.postalCode]);

  const goToPreviousStep = useCallback(() => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setErrorMsg("");

      // Piège à automates : réponse de succès simulée, sans envoi.
      if (formData.honeypot) {
        router.push("/devis/merci");
        return;
      }

      if (!formData.fullName || !formData.phone || !formData.email) {
        setErrorMsg("Veuillez remplir votre nom, téléphone et adresse email.");
        return;
      }
      if (!formData.rgpdConsent) {
        setErrorMsg("Veuillez accepter le consentement RGPD pour poursuivre.");
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
        // Ces deux champs n'étaient pas transmis. `rgpdConsent` étant exigé par
        // le serveur, *toute* demande était rejetée en 400.
        payload.append("description", formData.description);
        payload.append("rgpdConsent", formData.rgpdConsent ? "true" : "false");

        const response = await fetch("/api/devis", { method: "POST", body: payload });

        if (!response.ok) {
          // Plus de redirection vers la page de remerciement en cas d'échec :
          // annoncer un succès qui n'a pas eu lieu prive le client de sa
          // demande sans qu'il le sache.
          const data = await response.json().catch(() => null);
          setErrorMsg(
            data?.message ?? "Votre demande n'a pas pu être envoyée. Merci de réessayer."
          );
          return;
        }

        router.push("/devis/merci");
      } catch (err: unknown) {
        console.error("Échec de l'envoi de la demande de devis :", err);
        setErrorMsg(
          "Envoi impossible pour le moment. Vérifiez votre connexion, ou appelez-nous directement."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, router]
  );

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
    formData,
    setFormData,
    photos,
    isCompressing,
    isSubmitting,
    errorMsg,
    locationStatus,
    handlePhotoUpload,
    removePhoto,
    goToNextStep,
    goToPreviousStep,
    handleSubmit,
  };
}
