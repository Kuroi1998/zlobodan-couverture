"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface StatusOption {
  value: string;
  label: string;
}

interface WorkflowEditorProps {
  endpoint: string;
  currentStatus: string;
  options: StatusOption[];
  initialNotes?: string | null;
  assigneeOptions?: StatusOption[];
  initialAssigneeId?: string | null;
}

export default function WorkflowEditor({
  endpoint,
  currentStatus,
  options,
  initialNotes,
  assigneeOptions,
  initialAssigneeId,
}: Readonly<WorkflowEditorProps>) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [reason, setReason] = useState("");
  const [internalNotes, setInternalNotes] = useState(initialNotes ?? "");
  const [assigneeId, setAssigneeId] = useState(initialAssigneeId ?? "");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFeedback("");
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          reason: reason || undefined,
          internalNotes: internalNotes || undefined,
          ...(assigneeOptions
            ? { assignedToUserId: assigneeId || null }
            : {}),
        }),
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          typeof body === "object" &&
          body !== null &&
          "error" in body &&
          typeof body.error === "string"
            ? body.error
            : "Mise à jour impossible.";
        setFeedback(message);
        return;
      }
      setFeedback("Mise à jour enregistrée.");
      setReason("");
      router.refresh();
    } catch {
      setFeedback("Mise à jour impossible pour le moment.");
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
      <label className="block space-y-1">
        <span className="text-[10px] font-bold uppercase text-slate-400">
          Notes internes
        </span>
        <textarea
          value={internalNotes}
          maxLength={5000}
          rows={4}
          onChange={(event) => setInternalNotes(event.target.value)}
          className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
      </label>
      {feedback && <p className="text-xs text-amber-300">{feedback}</p>}
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
