"use client";

import { useState } from "react";

interface ApiResult {
  message?: string;
  error?: { message?: string };
}

async function submitJson(endpoint: string, body: Record<string, unknown>) {
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResult;
  return {
    ok: response.ok,
    message:
      payload.message ??
      payload.error?.message ??
      (response.ok ? "Action terminée." : "Action impossible."),
  };
}

export default function SecurityCredentialsForms() {
  const [feedback, setFeedback] = useState("");
  const [pending, setPending] = useState(false);

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await submitJson("/api/auth/change-password", {
      currentPassword: form.get("currentPassword"),
      newPassword: form.get("newPassword"),
      passwordConfirmation: form.get("passwordConfirmation"),
      verificationCode: form.get("verificationCode") || undefined,
    }).catch(() => ({ ok: false, message: "Serveur injoignable." }));
    setFeedback(result.message);
    if (result.ok) event.currentTarget.reset();
    setPending(false);
  }

  async function changeEmail(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const result = await submitJson("/api/auth/change-email", {
      newEmail: form.get("newEmail"),
      currentPassword: form.get("currentPassword"),
      verificationCode: form.get("verificationCode") || undefined,
    }).catch(() => ({ ok: false, message: "Serveur injoignable." }));
    setFeedback(result.message);
    if (result.ok) event.currentTarget.reset();
    setPending(false);
  }

  const input =
    "w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm";
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <form onSubmit={changePassword} className="space-y-3 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-bold text-white">Changer le mot de passe</h2>
        <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className={input} />
        <input name="newPassword" type="password" autoComplete="new-password" minLength={12} maxLength={128} required placeholder="Nouveau mot de passe" className={input} />
        <input name="passwordConfirmation" type="password" autoComplete="new-password" minLength={12} maxLength={128} required placeholder="Confirmer le nouveau mot de passe" className={input} />
        <input name="verificationCode" autoComplete="one-time-code" placeholder="Code 2FA si activée" className={input} />
        <button disabled={pending} className="rounded-xl bg-brand-terracotta px-4 py-2 font-bold disabled:opacity-60">Modifier</button>
      </form>
      <form onSubmit={changeEmail} className="space-y-3 rounded-2xl border border-slate-800 p-5">
        <h2 className="font-bold text-white">Changer l’adresse e-mail</h2>
        <p className="text-xs text-slate-400">La nouvelle adresse ne remplace l’ancienne qu’après confirmation.</p>
        <input name="newEmail" type="email" autoComplete="email" required placeholder="Nouvelle adresse" className={input} />
        <input name="currentPassword" type="password" autoComplete="current-password" required placeholder="Mot de passe actuel" className={input} />
        <input name="verificationCode" autoComplete="one-time-code" placeholder="Code 2FA si activée" className={input} />
        <button disabled={pending} className="rounded-xl bg-brand-terracotta px-4 py-2 font-bold disabled:opacity-60">Envoyer la confirmation</button>
      </form>
      {feedback && <p role="status" className="lg:col-span-2 rounded-xl bg-slate-800 p-3 text-sm">{feedback}</p>}
    </div>
  );
}
