"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { NotebookPen } from "lucide-react";
import { readApiError } from "@/lib/api/client";

export interface InternalNoteView {
  id: string;
  content: string;
  authorEmail: string | null;
  createdAt: string;
}

interface InternalNotesPanelProps {
  entityType: "contact_message" | "quote_request";
  entityId: string;
  notes: readonly InternalNoteView[];
}

const MAX_LENGTH = 5000;

/**
 * Notes internes d'un dossier.
 *
 * Le composant est délibérément « bête » : il poste, puis demande à Next de
 * recharger le segment serveur. Aucune note n'est ajoutée localement à la
 * liste avant confirmation. C'est plus lent d'un aller-retour, mais une note
 * affichée n'est jamais une note qui n'existe pas en base — et sur une piste
 * de traitement de dossier, cette garantie vaut mieux que l'instantanéité.
 */
export default function InternalNotesPanel({
  entityType,
  entityId,
  notes,
}: Readonly<InternalNotesPanelProps>) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (saving || content.trim().length === 0) return;

    setSaving(true);
    setFeedback("");
    setFailed(false);
    try {
      const response = await fetch("/api/admin/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entityType, entityId, content }),
      });

      if (!response.ok) {
        setFailed(true);
        setFeedback(await readApiError(response, "Note non enregistrée."));
        return;
      }

      setContent("");
      setFeedback("Note enregistrée.");
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Note non enregistrée : le serveur est injoignable.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="space-y-3 rounded border border-slate-800 bg-slate-950 p-4">
      <h2 className="flex items-center gap-2 text-sm font-bold text-white">
        <NotebookPen className="h-4 w-4 text-amber-400" />
        Notes internes
        <span className="font-normal text-slate-500">({notes.length})</span>
      </h2>
      <p className="text-[10px] uppercase tracking-wide text-slate-500">
        Jamais visibles par le client
      </p>

      <form onSubmit={submit} className="space-y-2">
        <label className="block space-y-1">
          <span className="sr-only">Nouvelle note interne</span>
          <textarea
            value={content}
            maxLength={MAX_LENGTH}
            rows={3}
            onChange={(event) => setContent(event.target.value)}
            placeholder="Observation, suite à donner, échange téléphonique…"
            className="w-full rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
          />
        </label>
        <div className="flex items-center justify-between gap-3">
          <span className="text-[10px] text-slate-600">
            {content.length} / {MAX_LENGTH}
          </span>
          <button
            type="submit"
            disabled={saving || content.trim().length === 0}
            className="rounded bg-amber-600 px-3 py-1.5 text-[11px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Enregistrement…" : "Ajouter la note"}
          </button>
        </div>
        {feedback && (
          <p
            role="status"
            className={failed ? "text-xs text-red-400" : "text-xs text-emerald-400"}
          >
            {feedback}
          </p>
        )}
      </form>

      <ol className="space-y-2">
        {notes.map((note) => (
          <li key={note.id} className="rounded border border-slate-800 bg-slate-900 p-3">
            <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-slate-200">
              {note.content}
            </p>
            <p className="mt-2 text-[10px] text-slate-500">
              {note.authorEmail ?? "Auteur inconnu"} · {note.createdAt}
            </p>
          </li>
        ))}
      </ol>
      {notes.length === 0 && (
        <p className="text-[11px] text-slate-500">Aucune note sur ce dossier.</p>
      )}
    </section>
  );
}
