"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError, readApiMessage } from "@/lib/api/client";

interface ProfileFormProps {
  initialPhone: string | null;
  initialFirstName: string | null;
  initialLastName: string | null;
}

/**
 * Modification des coordonnées.
 *
 * Un seul champ est présent parce qu'un seul est modifiable. L'adresse e-mail
 * est affichée ailleurs, en lecture seule et sans champ de saisie : afficher un
 * champ désactivé laisserait croire qu'il s'agit d'une limitation temporaire.
 *
 * Aucune mise à jour optimiste : le champ n'affiche la nouvelle valeur qu'une
 * fois la réponse serveur reçue, puis le segment est rechargé. Un profil qui
 * paraît enregistré sans l'être est exactement le défaut que cette refonte
 * corrige.
 */
export default function ProfileForm({
  initialPhone,
  initialFirstName,
  initialLastName,
}: Readonly<ProfileFormProps>) {
  const router = useRouter();
  const [phone, setPhone] = useState(initialPhone ?? "");
  const [firstName, setFirstName] = useState(initialFirstName ?? "");
  const [lastName, setLastName] = useState(initialLastName ?? "");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;

    setSaving(true);
    setFeedback("");
    setFailed(false);
    try {
      const response = await fetch("/api/client/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone,
          ...(firstName.trim() ? { firstName } : {}),
          ...(lastName.trim() ? { lastName } : {}),
        }),
      });

      if (!response.ok) {
        setFailed(true);
        setFeedback(await readApiError(response, "Modification non enregistrée."));
        return;
      }

      setFeedback(await readApiMessage(response, "Profil mis à jour."));
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Modification non enregistrée : le serveur est injoignable.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="profile-first-name" className="block space-y-1">
          <span className="text-xs uppercase text-slate-500">Prénom</span>
          <input
            id="profile-first-name"
            name="firstName"
            autoComplete="given-name"
            maxLength={100}
            value={firstName}
            onChange={(event) => setFirstName(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
        <label htmlFor="profile-last-name" className="block space-y-1">
          <span className="text-xs uppercase text-slate-500">Nom</span>
          <input
            id="profile-last-name"
            name="lastName"
            autoComplete="family-name"
            maxLength={100}
            value={lastName}
            onChange={(event) => setLastName(event.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
        </label>
      </div>
      <label htmlFor="profile-phone" className="block space-y-1">
        <span className="text-xs uppercase text-slate-500">Téléphone</span>
        <input
          id="profile-phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          maxLength={30}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="04XX XX XX XX"
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-white"
        />
      </label>
      <p className="text-[11px] text-slate-500">
        Laissez le champ vide pour retirer votre numéro de nos dossiers.
      </p>
      {feedback && (
        <p
          role="status"
          className={failed ? "text-xs text-red-400" : "text-xs text-emerald-400"}
        >
          {feedback}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
