"use client";

import { useState } from "react";

export default function ResendVerificationForm() {
  const [message, setMessage] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: form.get("email") }),
    }).catch(() => null);
    const payload = response
      ? ((await response.json().catch(() => ({}))) as { message?: string })
      : {};
    setMessage(
      payload.message ??
        "Si un compte non vérifié correspond, un nouvel e-mail sera envoyé."
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2 border-t border-slate-800 pt-4">
      <label className="block text-sm font-bold" htmlFor="resend-email">
        Renvoyer l’e-mail
      </label>
      <input id="resend-email" name="email" type="email" autoComplete="email" required className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
      <button className="rounded-xl bg-slate-700 px-4 py-2 text-sm font-bold">Renvoyer</button>
      {message && <p role="status" className="text-xs text-slate-400">{message}</p>}
    </form>
  );
}
