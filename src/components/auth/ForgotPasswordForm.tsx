"use client";

import { useState } from "react";

export default function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    setMessage(
      payload.message ??
        "Si un compte correspond à cette adresse, un e-mail de réinitialisation a été envoyé."
    );
    setPending(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-bold">Adresse e-mail</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          required
          className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3"
        />
      </label>
      <button disabled={pending} className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60">
        {pending ? "Envoi…" : "Recevoir le lien"}
      </button>
      {message && <p role="status" className="rounded-xl bg-slate-800 p-3 text-sm">{message}</p>}
    </form>
  );
}
