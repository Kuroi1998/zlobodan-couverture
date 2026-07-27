import Link from "next/link";
import { ArrowRight, FilePlus2, FileText, Phone } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { getClientDashboard } from "@/lib/services/client-portal-service";
import {
  interventionLabel,
  quoteRequestClientLabel,
  quoteRequestNextStep,
  quoteRequestTone,
} from "@/domain/request-labels";
import { siteConfig } from "@/config/site";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

/**
 * Tableau de bord client.
 *
 * Les tuiles « Devis à examiner » et « Pièces jointes » ont disparu : la
 * première lisait `quotes`, table sans chemin de création en V1, donc figée à
 * zéro ; la seconde comptait un volume qui n'appelle aucune action.
 *
 * Ce qui reste répond à la seule question que se pose un client qui se
 * connecte : où en est mon dossier, et que se passe-t-il ensuite.
 */
export default async function ClientDashboardPage() {
  const user = await requirePageAuth("/mon-compte");
  const dashboard = await getClientDashboard(user.id);
  const lastRequest = dashboard.latest[0];

  return (
    <div className="space-y-8">
      <div className="relative space-y-3 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-8">
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
          Votre espace client
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">{user.email}</p>
      </div>

      {lastRequest ? (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <p className="text-xs uppercase text-slate-500">Votre dernière demande</p>
              <p className="text-lg font-bold text-white">{lastRequest.reference}</p>
              <p className="text-sm text-slate-400">
                {interventionLabel(lastRequest.interventionType)} · {lastRequest.city} ·{" "}
                {lastRequest.createdAt.toLocaleDateString("fr-BE")}
              </p>
            </div>
            <StatusBadge
              label={quoteRequestClientLabel(lastRequest.status)}
              tone={quoteRequestTone(lastRequest.status)}
            />
          </div>
          <p className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-sm text-slate-300">
            {quoteRequestNextStep(lastRequest.status)}
          </p>
          <Link
            href={`/mon-compte/demandes/${encodeURIComponent(lastRequest.reference)}`}
            className="inline-flex items-center gap-1 text-xs font-bold text-brand-terracotta hover:underline"
          >
            Voir le détail <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </section>
      ) : (
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-8 text-center">
          <FileText className="mx-auto h-8 w-8 text-slate-500" />
          <p className="text-slate-200">Vous n&apos;avez encore envoyé aucune demande.</p>
          <p className="text-sm text-slate-500">
            Décrivez votre projet de toiture en cinq étapes, photos comprises.
          </p>
          <Link
            href="/devis"
            className="inline-flex items-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
          >
            <FilePlus2 className="h-4 w-4" />
            Demander un devis
          </Link>
        </section>
      )}

      {dashboard.requests.total > 0 && (
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <span className="text-xs font-bold uppercase text-slate-400">
              Demandes en cours
            </span>
            <p className="text-3xl font-extrabold text-white">{dashboard.requests.active}</p>
            <p className="text-xs text-slate-500">
              sur {dashboard.requests.total} demande(s) déposée(s)
            </p>
            <Link
              href="/mon-compte/demandes"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-terracotta hover:underline"
            >
              Consulter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <span className="text-xs font-bold uppercase text-slate-400">
              Messages envoyés
            </span>
            <p className="text-3xl font-extrabold text-white">{dashboard.exchanges}</p>
            <p className="text-xs text-slate-500">Via le formulaire de contact</p>
            <Link
              href="/mon-compte/messages"
              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-brand-terracotta hover:underline"
            >
              Consulter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      )}

      {dashboard.latest.length > 1 && (
        <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-bold text-white">Demandes précédentes</h2>
          {dashboard.latest.slice(1).map((request) => (
            <Link
              key={request.reference}
              href={`/mon-compte/demandes/${encodeURIComponent(request.reference)}`}
              className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:border-slate-700 sm:flex-row sm:items-center"
            >
              <div>
                <p className="font-bold text-white">
                  {request.reference} · {interventionLabel(request.interventionType)}
                </p>
                <p className="text-xs text-slate-500">
                  {request.city} · {request.createdAt.toLocaleDateString("fr-BE")}
                </p>
              </div>
              <StatusBadge
                label={quoteRequestClientLabel(request.status)}
                tone={quoteRequestTone(request.status)}
              />
            </Link>
          ))}
        </section>
      )}

      <section className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-3xl border border-slate-800 bg-slate-900 p-6 text-sm">
        <span className="flex items-center gap-2 font-bold text-white">
          <Phone className="h-4 w-4 text-brand-terracotta" />
          Une question ?
        </span>
        <Link href="/contact" className="text-brand-terracotta hover:underline">
          Formulaire de contact
        </Link>
      </section>
    </div>
  );
}
