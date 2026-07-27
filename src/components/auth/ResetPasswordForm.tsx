"use client";

import { useState } from "react";
import Link from "next/link";

export default function ResetPasswordForm({ token }: Readonly<{ token: string }>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        newPassword: form.get("newPassword"),
        passwordConfirmation: form.get("passwordConfirmation"),
      }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as {
          message?: string;
          error?: { message?: string };
        })
      : {};
    setSuccess(Boolean(response?.ok));
    setMessage(
      payload.message ??
        payload.error?.message ??
        "La réinitialisation n'a pas abouti."
    );
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!success && (
        <>
          <label className="block space-y-1">
            <span className="text-sm font-bold">Nouveau mot de passe</span>
            <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-bold">Confirmer le mot de passe</span>
            <input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
          </label>
          <button disabled={pending || token.length !== 64} className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60">
            {pending ? "Réinitialisation…" : "Enregistrer le mot de passe"}
          </button>
        </>
      )}
      {message && <p role="status" className="rounded-xl bg-slate-800 p-3 text-sm">{message}</p>}
      {success && <Link href="/connexion" className="block text-center text-brand-terracotta underline">Retour à la connexion</Link>}
    </form>
  );
}
