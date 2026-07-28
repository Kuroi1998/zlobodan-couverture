"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2 } from "lucide-react";

export default function QuoteDecisionButtons({ quoteId }: Readonly<{ quoteId: string }>) {
  const router = useRouter();
  const [processing, setProcessing] = useState(false);
  const [feedback, setFeedback] = useState("");

  async function decide(action: "accept" | "refuse"): Promise<void> {
    if (processing) return;
    setProcessing(true);
    setFeedback("");
    try {
      const response = await fetch(`/api/client/devis/${quoteId}/${action}`, { method: "POST" });
      const body: unknown = await response.json().catch(() => null);
      const message =
        typeof body === "object" &&
        body !== null &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : typeof body === "object" &&
              body !== null &&
              "error" in body &&
              typeof body.error === "string"
            ? body.error
            : "Décision impossible.";
      setFeedback(message);
      if (response.ok) router.refresh();
    } catch {
      setFeedback("Décision impossible pour le moment.");
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <button
          type="button"
          disabled={processing}
          onClick={() => decide("refuse")}
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200 disabled:opacity-60"
        >
          Refuser
        </button>
        <button
          type="button"
          disabled={processing}
          onClick={() => decide("accept")}
          className="flex items-center justify-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          <CheckCircle2 className="h-4 w-4" />
          Accepter et signer
        </button>
      </div>
      {feedback && <p className="text-xs text-amber-300">{feedback}</p>}
    </div>
  );
}
