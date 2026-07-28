"use client";

import {
  useCallback,
  useEffect,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { FormDataState } from "./quote-form.types";

interface StoredDraft {
  id: string;
  reference: string;
  interventionType: string;
  roofType: string;
  surface: string;
  isUrgent: boolean;
  postalCode: string;
  city: string;
  fullName: string;
  phone: string;
  email: string;
  description: string | null;
  consentPrivacy: boolean;
}

interface UseServerQuoteDraftParams {
  formData: FormDataState;
  submissionKey: string;
  setFormData: Dispatch<SetStateAction<FormDataState>>;
  setCurrentStep: Dispatch<SetStateAction<number>>;
  setErrorMsg: Dispatch<SetStateAction<string>>;
  resetForm: () => void;
}

function draftDataForStep(form: FormDataState, step: number) {
  return {
    interventionType: form.interventionType,
    ...(step >= 2 ? { roofType: form.roofType } : {}),
    ...(step >= 3
      ? { surface: form.surface, isUrgent: form.isUrgent }
      : {}),
    ...(step >= 4 ? { postalCode: form.postalCode, city: form.city } : {}),
  };
}

function isStoredDraft(value: unknown): value is StoredDraft {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return (
    typeof draft.id === "string" &&
    typeof draft.reference === "string" &&
    typeof draft.interventionType === "string" &&
    typeof draft.roofType === "string" &&
    typeof draft.surface === "string" &&
    typeof draft.isUrgent === "boolean" &&
    typeof draft.postalCode === "string" &&
    typeof draft.city === "string" &&
    typeof draft.fullName === "string" &&
    typeof draft.phone === "string" &&
    typeof draft.email === "string" &&
    (typeof draft.description === "string" || draft.description === null) &&
    typeof draft.consentPrivacy === "boolean"
  );
}

function isStoredDraftSummary(
  value: unknown
): value is Pick<StoredDraft, "id" | "reference"> {
  if (typeof value !== "object" || value === null) return false;
  const draft = value as Record<string, unknown>;
  return typeof draft.id === "string" && typeof draft.reference === "string";
}

export function useServerQuoteDraft({
  formData,
  submissionKey,
  setFormData,
  setCurrentStep,
  setErrorMsg,
  resetForm,
}: UseServerQuoteDraftParams) {
  const [draftId, setDraftId] = useState<string | null>(null);
  const [draftReference, setDraftReference] = useState("");
  const [draftsEnabled, setDraftsEnabled] = useState(false);

  useEffect(() => {
    let active = true;
    void fetch("/api/devis/draft", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error("draft-load-failed");
        const body: unknown = await response.json();
        if (typeof body !== "object" || body === null) {
          throw new Error("draft-invalid-response");
        }
        const result = body as Record<string, unknown>;
        if (!active) return;
        if (result.authenticated !== true) return;
        setDraftsEnabled(true);
        if (result.draft === null) return;
        if (!isStoredDraft(result.draft)) {
          throw new Error("draft-invalid-response");
        }
        const draft = result.draft;
        setDraftId(draft.id);
        setDraftReference(draft.reference);
        setFormData((current) => ({
          ...current,
          interventionType: draft.interventionType || current.interventionType,
          roofType: draft.roofType || current.roofType,
          surface: draft.surface || current.surface,
          isUrgent: draft.isUrgent,
          postalCode: draft.postalCode || current.postalCode,
          city: draft.city || current.city,
          fullName: draft.fullName || current.fullName,
          phone: draft.phone || current.phone,
          email: draft.email || current.email,
          description: draft.description || current.description,
          rgpdConsent: draft.consentPrivacy,
        }));
        if (draft.postalCode && draft.city) setCurrentStep(5);
      })
      .catch(() => {
        if (active) setErrorMsg("Le brouillon n'a pas pu être repris.");
      });
    return () => {
      active = false;
    };
  }, [setCurrentStep, setErrorMsg, setFormData]);

  const saveDraft = useCallback(
    async (step: number): Promise<boolean> => {
      if (!draftsEnabled) return true;
      try {
        const response = await fetch("/api/devis/draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": submissionKey,
          },
          body: JSON.stringify({
            draftId: draftId ?? undefined,
            data: draftDataForStep(formData, step),
          }),
        });
        if (response.status === 401) {
          setDraftsEnabled(false);
          return true;
        }
        const body: unknown = await response.json().catch(() => null);
        const draft =
          typeof body === "object" && body !== null && "draft" in body
            ? body.draft
            : null;
        if (!response.ok || !isStoredDraftSummary(draft)) {
          setErrorMsg("Le brouillon n'a pas pu être enregistré.");
          return false;
        }
        setDraftId(draft.id);
        setDraftReference(draft.reference);
        return true;
      } catch {
        setErrorMsg("Le brouillon n'a pas pu être enregistré.");
        return false;
      }
    },
    [draftId, draftsEnabled, formData, setErrorMsg, submissionKey]
  );

  const deleteDraft = useCallback(async (): Promise<void> => {
    if (!draftId) return;
    const response = await fetch("/api/devis/draft", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ draftId }),
    });
    if (!response.ok) {
      setErrorMsg("Le brouillon n'a pas pu être supprimé.");
      return;
    }
    setDraftId(null);
    setDraftReference("");
    resetForm();
    setErrorMsg("");
  }, [draftId, resetForm, setErrorMsg]);

  return { draftId, draftReference, saveDraft, deleteDraft };
}
