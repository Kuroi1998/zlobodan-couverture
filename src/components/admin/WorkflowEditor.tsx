"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiError } from "@/lib/api/client";

interface StatusOption {
  value: string;
  label: string;
}

interface WorkflowEditorProps {
  endpoint: string;
  currentStatus: string;
  options: readonly StatusOption[];
  assigneeOptions?: readonly StatusOption[];
  initialAssigneeId?: string | null;
}

/**
 * Transition de statut et affectation.
 *
 * Les notes internes ont quitté ce formulaire : elles étaient postées avec
 * chaque changement de statut et écrasaient la note précédente. Elles vivent
 * désormais dans `InternalNotesPanel`, avec leur propre table, leur auteur et
 * leur historique.
 */
export default function WorkflowEditor({
  endpoint,
  currentStatus,
  options,
  assigneeOptions,
  initialAssigneeId,
}: Readonly<WorkflowEditorProps>) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId ?? "");
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback("");
    setFailed(false);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: reason || undefined,
          ...(assigneeOptions ? { assignedToUserId: assigneeId || null } : {}),
        }),
      });

      if (!response.ok) {
        setFailed(true);
        setFeedback(await readApiError(response, "Mise à jour impossible."));
        return;
      }

      setFeedback("Mise à jour enregistrée.");
      setReason("");
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Mise à jour impossible : le serveur est injoignable.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-3 rounded border border-slate-800 bg-slate-950 p-4">
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase text-slate-400">Statut</span>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      {assigneeOptions && (
        <label className="block space-y-1">
          <span className="text-[10px] font-bold uppercase text-slate-400">
            Responsable
          </span>
          <select
            value={assigneeId}
            onChange={(event) => setAssigneeId(event.target.value)}
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          >
            <option value="">Non affecté</option>
            {assigneeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase text-slate-400">
          Motif du changement
        </span>
        <input
          value={reason}
          maxLength={500}
          onChange={(event) => setReason(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>
      {feedback && (
        <p role="status" className={failed ? "text-xs text-red-400" : "text-xs text-emerald-400"}>
          {feedback}
        </p>
      )}
      <button
        type="submit"
        disabled={saving}
        className="rounded bg-brand-terracotta px-4 py-2 font-bold text-white disabled:opacity-60"
      >
        {saving ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}
