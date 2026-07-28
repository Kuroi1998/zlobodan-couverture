"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download, Eye, FileText, RefreshCw } from "lucide-react";
import { readApiError } from "@/lib/api/client";

export interface DocumentVersionSummary {
  readonly versionNumber: number;
  readonly state: "pending" | "ready" | "failed";
  readonly createdAt: string;
  readonly checksum: string | null;
  readonly isCurrent: boolean;
}

export interface DocumentSummary {
  readonly publicId: string;
  readonly reference: string;
  readonly title: string;
  readonly status: string;
  readonly versions: readonly DocumentVersionSummary[];
}

interface DocumentsPanelProps {
  readonly endpoint: string;
  readonly documents: readonly DocumentSummary[];
  readonly canGenerate: boolean;
}

/**
 * Génération et historique des documents d'une demande.
 *
 * Deux actions distinctes, volontairement séparées :
 *
 *  - « Générer » est idempotent. Si les données de la demande n'ont pas bougé,
 *    le serveur rend la version existante au lieu d'en empiler une identique.
 *  - « Nouvelle version » force l'émission. C'est un geste explicite, confirmé,
 *    car il produit un fichier de plus à conserver.
 *
 * Le composant n'envoie que l'intention : ni le contenu du document, ni le
 * propriétaire, ni la référence. Tout est relu côté serveur depuis PostgreSQL.
 */
export default function DocumentsPanel({
  endpoint,
  documents,
  canGenerate,
}: Readonly<DocumentsPanelProps>) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [failed, setFailed] = useState(false);

  async function generate(force: boolean): Promise<void> {
    if (busy) return;
    if (
      force &&
      !window.confirm(
        "Émettre une nouvelle version ? L'ancienne restera consultable et conservée."
      )
    ) {
      return;
    }

    setBusy(true);
    setFeedback("");
    setFailed(false);

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentType: "quote_request_summary", force }),
      });

      if (!response.ok) {
        setFailed(true);
        setFeedback(
          await readApiError(response, "Le document n'a pas pu être généré.")
        );
        return;
      }

      // 201 signale une version réellement ajoutée, 200 une réutilisation.
      setFeedback(
        response.status === 201
          ? "Document généré avec succès."
          : "Document déjà à jour : la version existante a été conservée."
      );
      router.refresh();
    } catch {
      setFailed(true);
      setFeedback("Le document n'a pas pu être généré.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate-300">
          Documents
        </h2>
        <FileText className="h-4 w-4 text-slate-500" />
      </div>

      {canGenerate && (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void generate(false)}
            disabled={busy}
            className="rounded-xl bg-brand-terracotta px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? "Génération…" : "Générer le récapitulatif"}
          </button>
          {documents.length > 0 && (
            <button
              type="button"
              onClick={() => void generate(true)}
              disabled={busy}
              className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Nouvelle version
            </button>
          )}
        </div>
      )}

      {feedback && (
        <p
          role="status"
          className={`text-xs ${failed ? "text-red-400" : "text-emerald-400"}`}
        >
          {feedback}
        </p>
      )}

      {documents.length === 0 ? (
        <p className="text-xs text-slate-500">
          Aucun document n'a encore été établi pour cette demande.
        </p>
      ) : (
        <ul className="space-y-4">
          {documents.map((document) => (
            <li key={document.publicId} className="space-y-2">
              <div>
                <p className="text-sm font-bold text-white">{document.title}</p>
                <p className="text-xs text-slate-500">
                  {document.reference} · {document.status}
                </p>
              </div>

              <div className="flex gap-2">
                <a
                  href={`/api/documents/${document.publicId}/preview`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                >
                  <Eye className="h-3.5 w-3.5" /> Consulter
                </a>
                <a
                  href={`/api/documents/${document.publicId}/download`}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs text-brand-terracotta hover:bg-slate-700"
                >
                  <Download className="h-3.5 w-3.5" /> Télécharger
                </a>
              </div>

              <ul className="space-y-1 border-l border-slate-800 pl-3 text-xs">
                {document.versions.map((version) => (
                  <li
                    key={version.versionNumber}
                    className="flex flex-wrap items-center gap-2 text-slate-400"
                  >
                    <span className="font-bold text-slate-300">
                      v{version.versionNumber}
                    </span>
                    <span>{version.createdAt}</span>
                    {version.isCurrent && (
                      <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-400">
                        courante
                      </span>
                    )}
                    {version.state !== "ready" && (
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-bold text-slate-400">
                        {version.state === "pending" ? "en cours" : "échec"}
                      </span>
                    )}
                    {version.state === "ready" && (
                      <a
                        href={`/api/documents/${document.publicId}/download?version=${version.versionNumber}`}
                        className="text-brand-terracotta hover:underline"
                      >
                        télécharger
                      </a>
                    )}
                    {version.checksum && (
                      // Empreinte tronquée : elle sert à comparer d'un coup
                      // d'œil deux versions, pas à vérifier l'intégrité — ce
                      // que fait le service au téléchargement.
                      <span className="font-mono text-[10px] text-slate-600">
                        {version.checksum.slice(0, 12)}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
