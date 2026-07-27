"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Frontière d'erreur d'un segment authentifié.
 *
 * Le message est fixe et ne reprend **rien** de l'objet `error` : en
 * production, `error.message` d'une erreur serveur est déjà remplacé par Next
 * par un identifiant opaque, mais s'appuyer sur ce comportement reviendrait à
 * faire dépendre l'étanchéité d'un détail du cadriciel. Le seul élément
 * technique affiché est le `digest`, qui est justement conçu pour être montré :
 * il permet à l'utilisateur de citer l'incident, et à l'exploitant de le
 * retrouver dans les journaux.
 */
export default function SegmentError({
  error,
  reset,
  title,
  description,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
  title: string;
  description: string;
}>) {
  return (
    <div
      role="alert"
      className="space-y-4 rounded-3xl border border-red-900 bg-slate-900 p-8"
    >
      <AlertTriangle className="h-7 w-7 text-red-400" />
      <h2 className="text-lg font-bold text-white">{title}</h2>
      <p className="text-sm text-slate-400">{description}</p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
        >
          Réessayer
        </button>
        <Link
          href="/contact"
          className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-bold text-slate-200"
        >
          Nous signaler le problème
        </Link>
      </div>
      {error.digest && (
        <p className="text-[11px] text-slate-600">
          Référence de l&apos;incident : {error.digest}
        </p>
      )}
    </div>
  );
}
