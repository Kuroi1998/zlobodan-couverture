"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { XCircle } from "lucide-react";
import { readApiError, readApiMessage } from "@/lib/api/client";

interface CancelRequestButtonProps {
  reference: string;
}

/**
 * Annulation d'une demande.
 *
 * Le bouton n'est rendu par la page que si la machine à états autorise
 * réellement la transition. Ce n'est pas une sécurité — le serveur revérifie —
 * mais c'est la condition pour qu'aucun bouton visible ne soit sans effet.
 *
 * La confirmation est un second clic plutôt qu'un `window.confirm` : la boîte
 * native est bloquée par certains navigateurs en contexte restreint, et le
 * geste resterait alors irréversible sans avertissement.
 */
export default function CancelRequestButton({
  reference,
}: Readonly<CancelRequestButtonProps>) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  async function cancel(): Promise<void> {
    if (pending) return;
    setPending(true);
    setFeedback("");
    setFailed(false);
    try {
      const response = await fetch(
        `/api/client/demandes/${encodeURIComponent(reference)}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        setFailed(true);
        setFeedback(await readApiError(response, "Annulation impossible."));
        return;
      }

      setFeedback(await readApiMessage(response, "Demande annulée."));
      setConfirming(false);
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Annulation impossible : le serveur est injoignable.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-2">
      {confirming ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <span className="text-xs text-slate-300">
            Confirmer l&apos;annulation de {reference} ?
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={pending}
              className="rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200"
            >
              Non, garder
            </button>
            <button
              type="button"
              onClick={cancel}
              disabled={pending}
              className="rounded-xl bg-red-700 px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
            >
              {pending ? "Annulation…" : "Oui, annuler"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
        >
          <XCircle className="h-4 w-4" />
          Annuler cette demande
        </button>
      )}
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
