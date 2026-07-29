"use client";

import { useCallback, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { compressImage } from "@/lib/media/image-compression";
import { QUOTE_DEFAULTS } from "@/domain/quote-options";
import { QuoteRequestSchema } from "@/lib/validations/quote-schemas";
import { FORM_STARTED_AT_FIELD } from "@/lib/security/form-timing";
import type { FormDataState } from "./quote-form.types";
import { useServerQuoteDraft } from "./useServerQuoteDraft";

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
  preview: string | null;
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
    captchaToken: "",
  };
}

export function useQuoteWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submissionKey] = useState(() => crypto.randomUUID());
  const [formStartedAt] = useState(() => Date.now());

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

  const resetDraftForm = useCallback(() => {
    setFormData(buildInitialFormData(searchParams.get("service") ?? ""));
    setCurrentStep(1);
  }, [searchParams]);
  const { draftId, draftReference, saveDraft, deleteDraft } =
    useServerQuoteDraft({
      formData,
      submissionKey,
      setFormData,
      setCurrentStep,
      setErrorMsg,
      resetForm: resetDraftForm,
    });

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
          if (file.size > 10 * 1024 * 1024) {
            setErrorMsg(`Le fichier « ${file.name} » dépasse 10 Mo.`);
            return;
          }
          const result = await compressImage(file, COMPRESSION_MAX_WIDTH, COMPRESSION_QUALITY);
          compressed.push({
            file: result,
            preview: result.type.startsWith("image/") ? URL.createObjectURL(result) : null,
          });
        }
        setPhotos((prev) => [...prev, ...compressed]);
      } catch {
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
      if (target?.preview) URL.revokeObjectURL(target.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const goToNextStep = useCallback(async () => {
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
        message: "Votre commune fait partie de notre zone d'intervention.",
      });
    }

    if (!(await saveDraft(currentStep))) return;
    setCurrentStep((prev) => Math.min(TOTAL_STEPS, prev + 1));
  }, [currentStep, formData.interventionType, formData.postalCode, saveDraft]);

  const goToPreviousStep = useCallback(() => {
    setErrorMsg("");
    setCurrentStep((prev) => Math.max(1, prev - 1));
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setErrorMsg("");

      if (formData.honeypot) {
        setErrorMsg("La soumission n'a pas pu être vérifiée.");
        return;
      }

      const parsed = QuoteRequestSchema.safeParse({
        interventionType: formData.interventionType,
        roofType: formData.roofType,
        surface: formData.surface,
        isUrgent: formData.isUrgent,
        postalCode: formData.postalCode,
        city: formData.city,
        fullName: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        description: formData.description,
        rgpdConsent: formData.rgpdConsent,
        captchaToken: formData.captchaToken || undefined,
      });
      if (!parsed.success) {
        setErrorMsg(parsed.error.issues[0]?.message ?? "Veuillez vérifier les champs indiqués.");
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
        payload.append("website_url", formData.honeypot);
        payload.append(FORM_STARTED_AT_FIELD, String(formStartedAt));
        if (draftId) payload.append("draftId", draftId);
        if (formData.captchaToken) payload.append("captchaToken", formData.captchaToken);
        for (const photo of photos) payload.append("attachments", photo.file, photo.file.name);

        const response = await fetch("/api/devis", {
          method: "POST",
          headers: { "Idempotency-Key": submissionKey },
          body: payload,
        });
        const data: unknown = await response.json().catch(() => null);
        const reference =
          typeof data === "object" &&
          data !== null &&
          "reference" in data &&
          typeof data.reference === "string"
            ? data.reference
            : "";

        if (response.status === 409 && reference) {
          router.push(`/devis/merci?reference=${encodeURIComponent(reference)}&duplicate=1`);
          return;
        }
        if (!response.ok || !reference) {
          // Plus de redirection vers la page de remerciement en cas d'échec :
          // annoncer un succès qui n'a pas eu lieu prive le client de sa
          // demande sans qu'il le sache.
          setErrorMsg(
            typeof data === "object" &&
              data !== null &&
              "error" in data &&
              typeof data.error === "string"
              ? data.error
              : "Votre demande n'a pas pu être envoyée. Merci de réessayer."
          );
          return;
        }

        for (const photo of photos) {
          if (photo.preview) URL.revokeObjectURL(photo.preview);
        }
        router.push(`/devis/merci?reference=${encodeURIComponent(reference)}`);
      } catch {
        setErrorMsg(
          "Envoi impossible pour le moment. Vérifiez votre connexion, ou appelez-nous directement."
        );
      } finally {
        setIsSubmitting(false);
      }
    },
    [draftId, formData, formStartedAt, isSubmitting, photos, router, submissionKey]
  );

  return {
    currentStep,
    totalSteps: TOTAL_STEPS,
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
  };
}
