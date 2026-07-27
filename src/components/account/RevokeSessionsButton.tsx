"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError, readApiMessage } from "@/lib/api/client";

/**
 * Fermeture des autres sessions.
 *
 * N'est rendu que lorsqu'il existe au moins une autre session : sans cela le
 * bouton serait présent en permanence pour n'avoir aucun effet observable dans
 * le cas courant.
 */
export default function RevokeSessionsButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  async function revoke(): Promise<void> {
    if (pending) return;
    setPending(true);
    setFeedback("");
    setFailed(false);
    try {
      const response = await fetch("/api/client/sessions/revoke-others", {
        method: "POST",
      });

      if (!response.ok) {
        setFailed(true);
        setFeedback(await readApiError(response, "Fermeture impossible."));
        return;
      }

      setFeedback(await readApiMessage(response, "Vos autres sessions ont été fermées."));
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Fermeture impossible : le serveur est injoignable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={revoke}
        disabled={pending}
        className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-60"
      >
        {pending ? "Fermeture…" : "Fermer mes autres sessions"}
      </button>
      {feedback && (
        <p
          role="status"
          className={failed ? "text-xs text-red-400" : "text-xs text-emerald-400"}
        >
          {feedback}
        </p>
      )}
    </div>
  );
}
