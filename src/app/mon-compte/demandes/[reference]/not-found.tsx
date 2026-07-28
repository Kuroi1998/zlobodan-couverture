import Link from "next/link";
import { FileQuestion } from "lucide-react";

/**
 * Demande introuvable.
 *
 * Même page que la demande d'un autre client : le service ne distingue pas les
 * deux cas, et cette page ne doit pas les distinguer non plus. Le libellé est
 * donc volontairement neutre — « cette demande n'existe pas **ou** ne vous
 * appartient pas » suffirait déjà à confirmer l'existence d'une référence.
 */
export default function RequestNotFound() {
  return (
    <div className="max-w-xl space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
      <FileQuestion className="mx-auto h-8 w-8 text-slate-500" />
      <h1 className="text-lg font-bold text-white">Demande introuvable</h1>
      <p className="text-sm text-slate-400">
        Aucune demande de votre compte ne correspond à cette référence.
      </p>
      <Link
        href="/mon-compte/demandes"
        className="inline-block rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
      >
        Voir mes demandes
      </Link>
    </div>
  );
}
