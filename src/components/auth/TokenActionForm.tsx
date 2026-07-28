"use client";

import { useState } from "react";
import Link from "next/link";

interface Props {
  token: string;
  action: "verify-email" | "confirm-email-change";
}

export default function TokenActionForm({ token, action }: Readonly<Props>) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function submit(): Promise<void> {
    if (pending) return;
    setPending(true);
    const endpoint =
      action === "verify-email"
        ? "/api/auth/verify-email"
        : "/api/auth/change-email/confirm";
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
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
        "Ce lien est invalide ou a expiré."
    );
    setPending(false);
  }

  return (
    <div className="space-y-4">
      {!success && (
        <button
          type="button"
          onClick={submit}
          disabled={pending || token.length !== 64}
          className="w-full rounded-xl bg-brand-terracotta py-3 font-bold disabled:opacity-60"
        >
          {pending
            ? "Vérification…"
            : action === "verify-email"
              ? "Vérifier mon adresse"
              : "Confirmer la nouvelle adresse"}
        </button>
      )}
      {message && <p role="status" className="rounded-xl bg-slate-800 p-3 text-sm">{message}</p>}
      {success && <Link href="/connexion" className="block text-center text-brand-terracotta underline">Se connecter</Link>}
    </div>
  );
}
