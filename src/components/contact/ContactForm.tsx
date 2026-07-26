"use client";

import { useCallback, useState } from "react";
import { CheckCircle2, Send } from "lucide-react";
import TurnstileWidget from "@/components/forms/TurnstileWidget";
import {
  ContactMessageSchema,
  type ContactSubject,
} from "@/lib/validations/contact-schemas";
import { FORM_STARTED_AT_FIELD } from "@/lib/security/form-timing";

interface ContactFormState {
  fullName: string;
  phone: string;
  email: string;
  subject: ContactSubject;
  message: string;
  consentPrivacy: boolean;
  captchaToken: string;
  companyWebsite: string;
}

const INITIAL_STATE: ContactFormState = {
  fullName: "",
  phone: "",
  email: "",
  subject: "general",
  message: "",
  consentPrivacy: false,
  captchaToken: "",
  companyWebsite: "",
};

function responseMessage(value: unknown, fallback: string): string {
  if (typeof value !== "object" || value === null || !("error" in value)) return fallback;
  return typeof value.error === "string" ? value.error : fallback;
}

export default function ContactForm() {
  const [form, setForm] = useState<ContactFormState>(INITIAL_STATE);
  const [formStartedAt, setFormStartedAt] = useState(() => Date.now());
  const [submissionKey, setSubmissionKey] = useState(() => crypto.randomUUID());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [reference, setReference] = useState("");
  const setCaptchaToken = useCallback(
    (captchaToken: string) => setForm((current) => ({ ...current, captchaToken })),
    []
  );

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (isSubmitting) return;
    setError("");

    const candidate = {
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      subject: form.subject,
      message: form.message,
      consentPrivacy: form.consentPrivacy,
      captchaToken: form.captchaToken || undefined,
    };
    const parsed = ContactMessageSchema.safeParse(candidate);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Veuillez vérifier les champs indiqués.");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": submissionKey,
        },
        body: JSON.stringify({
          ...parsed.data,
          company_website: form.companyWebsite,
          [FORM_STARTED_AT_FIELD]: formStartedAt,
        }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const receivedReference =
        typeof payload === "object" &&
        payload !== null &&
        "reference" in payload &&
        typeof payload.reference === "string"
          ? payload.reference
          : "";

      if (response.status === 409 && receivedReference) {
        setReference(receivedReference);
        return;
      }
      if (!response.ok || !receivedReference) {
        setError(
          responseMessage(
            payload,
            "Votre message n'a pas pu être enregistré pour le moment. Veuillez réessayer."
          )
        );
        return;
      }

      setReference(receivedReference);
      setForm(INITIAL_STATE);
      setFormStartedAt(Date.now());
      setSubmissionKey(crypto.randomUUID());
    } catch {
      setError("Envoi impossible pour le moment. Vérifiez votre connexion puis réessayez.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (reference) {
    return (
      <div className="rounded-2xl border border-emerald-800 bg-emerald-950/60 p-6 text-emerald-100">
        <CheckCircle2 className="mb-3 h-7 w-7 text-emerald-400" />
        <p className="font-bold">Votre message a bien été enregistré.</p>
        <p className="mt-1 text-sm">
          Référence : <strong>{reference}</strong>
        </p>
        <button
          type="button"
          onClick={() => setReference("")}
          className="mt-4 text-xs font-bold text-emerald-300 underline"
        >
          Envoyer un autre message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} aria-busy={isSubmitting} className="space-y-4">
      <input
        name="company_website"
        value={form.companyWebsite}
        onChange={(event) => setForm({ ...form, companyWebsite: event.target.value })}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label htmlFor="contact-name" className="text-xs font-bold uppercase text-slate-300">
            Nom complet *
          </label>
          <input
            id="contact-name"
            type="text"
            required
            minLength={2}
            maxLength={120}
            autoComplete="name"
            value={form.fullName}
            onChange={(event) => setForm({ ...form, fullName: event.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="contact-phone" className="text-xs font-bold uppercase text-slate-300">
            Téléphone *
          </label>
          <input
            id="contact-phone"
            type="tel"
            required
            autoComplete="tel"
            value={form.phone}
            onChange={(event) => setForm({ ...form, phone: event.target.value })}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-1">
        <label htmlFor="contact-email" className="text-xs font-bold uppercase text-slate-300">
          Email *
        </label>
        <input
          id="contact-email"
          type="email"
          required
          autoComplete="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none"
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="contact-subject" className="text-xs font-bold uppercase text-slate-300">
          Sujet *
        </label>
        <select
          id="contact-subject"
          value={form.subject}
          onChange={(event) => setForm({ ...form, subject: event.target.value as ContactSubject })}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none"
        >
          <option value="general">Renseignement général</option>
          <option value="emergency">Urgence toiture</option>
          <option value="follow_up">Suivi d'un dossier</option>
          <option value="complaint">Réclamation</option>
          <option value="other">Autre demande</option>
        </select>
      </div>
      <div className="space-y-1">
        <label htmlFor="contact-message" className="text-xs font-bold uppercase text-slate-300">
          Votre message *
        </label>
        <textarea
          id="contact-message"
          rows={5}
          required
          minLength={10}
          maxLength={5000}
          value={form.message}
          onChange={(event) => setForm({ ...form, message: event.target.value })}
          className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white focus:border-brand-terracotta focus:outline-none"
        />
      </div>
      <label className="flex items-start gap-3 text-xs leading-relaxed text-slate-400">
        <input
          type="checkbox"
          required
          checked={form.consentPrivacy}
          onChange={(event) => setForm({ ...form, consentPrivacy: event.target.checked })}
          className="mt-0.5"
        />
        J'accepte le traitement de mes données afin de recevoir une réponse à ma demande.
      </label>
      <TurnstileWidget onToken={setCaptchaToken} theme="dark" />
      {error && (
        <p role="alert" className="rounded-xl border border-red-800 bg-red-950/70 p-3 text-sm text-red-200">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-terracotta py-4 text-sm font-extrabold text-white shadow-accent transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Send className="h-4 w-4" />
        <span>{isSubmitting ? "Enregistrement en cours…" : "Envoyer le message"}</span>
      </button>
    </form>
  );
}
