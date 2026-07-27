"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  publicId: string;
  status: string;
}

export default function AdminAccountActions({
  publicId,
  status,
}: Readonly<Props>) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState("");
  const [feedback, setFeedback] = useState("");

  async function run(
    action: "status" | "sessions" | "password-reset"
  ): Promise<void> {
    if (pending) return;
    setPending(action);
    setFeedback("");
    const nextStatus = status === "disabled" ? "active" : "disabled";
    const response = await fetch(
      `/api/admin/accounts/${encodeURIComponent(publicId)}/${action}`,
      {
        method: action === "status" ? "PATCH" : action === "sessions" ? "DELETE" : "POST",
        headers:
          action === "status" ? { "Content-Type": "application/json" } : undefined,
        body:
          action === "status"
            ? JSON.stringify({ status: nextStatus, reason })
            : undefined,
      }
    ).catch(() => null);
    if (!response?.ok) {
      setFeedback("Action refusée ou indisponible.");
      setPending("");
      return;
    }
    setFeedback(
      action === "status"
        ? "Statut modifié."
        : action === "sessions"
          ? "Sessions révoquées."
          : "E-mail de réinitialisation mis en file."
    );
    setPending("");
    router.refresh();
  }

  return (
    <section className="space-y-3 rounded border border-slate-800 bg-slate-950 p-4">
      <h2 className="font-bold text-white">Actions de sécurité</h2>
      <label className="block space-y-1">
        <span className="text-[10px] uppercase text-slate-500">
          Motif de désactivation/réactivation
        </span>
        <input
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2"
        />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={Boolean(pending) || reason.trim().length < 3}
          onClick={() => run("status")}
          className="rounded bg-amber-700 px-3 py-2 font-bold disabled:opacity-50"
        >
          {status === "disabled" ? "Réactiver" : "Désactiver"}
        </button>
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => run("sessions")}
          className="rounded bg-red-800 px-3 py-2 font-bold disabled:opacity-50"
        >
          Révoquer les sessions
        </button>
        <button
          type="button"
          disabled={Boolean(pending)}
          onClick={() => run("password-reset")}
          className="rounded bg-slate-700 px-3 py-2 font-bold disabled:opacity-50"
        >
          Envoyer une réinitialisation
        </button>
      </div>
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}
