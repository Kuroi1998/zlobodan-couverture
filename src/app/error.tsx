"use client";

import Link from "next/link";

type ErrorPageProps = Readonly<{
  error: Error & {
    digest?: string;
  };
  reset: () => void;
}>;

export default function AppErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-4 py-16 text-white">
      <div className="w-full max-w-xl space-y-6 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl sm:p-10">
        <p className="text-sm font-bold uppercase tracking-widest text-brand-terracotta">
          Erreur temporaire
        </p>
        <h1 className="font-heading text-3xl font-extrabold sm:text-4xl">
          Une erreur est survenue
        </h1>
        <p className="text-slate-300">
          La page ne peut pas être affichée pour le moment. Vous pouvez réessayer
          ou revenir à l’accueil.
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-brand-terracotta px-6 py-3 font-bold text-white transition hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-terracotta"
          >
            Réessayer
          </button>
          <Link
            href="/"
            className="rounded-xl border border-slate-700 px-6 py-3 font-bold text-white transition hover:border-slate-500 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Retour à l’accueil
          </Link>
        </div>
      </div>
    </main>
  );
}
