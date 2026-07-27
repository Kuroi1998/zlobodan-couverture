import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, Paperclip } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { getClientRequestByReference } from "@/lib/services/client-portal-service";
import { canTransitionQuoteRequest } from "@/domain/request-workflow";
import {
  interventionLabel,
  quoteRequestClientLabel,
  quoteRequestNextStep,
  quoteRequestTone,
  roofLabel,
  surfaceLabel,
} from "@/domain/request-labels";
import StatusBadge from "@/components/ui/StatusBadge";
import CancelRequestButton from "@/components/account/CancelRequestButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Détail de ma demande | Espace client Zlobodan",
};

/**
 * Détail d'une demande.
 *
 * La référence sert de clé d'accès, mais elle ne suffit jamais : le service
 * conjugue référence et identifiant de session dans la même clause `where`.
 * Une référence valide appartenant à un autre compte produit exactement la
 * même page que le cas « n'existe pas » — un 404. Rien dans la réponse ne
 * permet de distinguer les deux, ce qui ferme l'énumération des références.
 *
 * Ce qui n'est **pas** rendu ici : notes internes, responsable affecté, motif
 * de transition, identifiants techniques. La projection du repository ne les
 * charge d'ailleurs pas — ils ne peuvent donc pas fuir dans la charge utile
 * sérialisée vers le navigateur, même par erreur de rendu.
 */
export default async function ClientRequestDetailPage({
  params,
}: Readonly<{ params: Promise<{ reference: string }> }>) {
  const user = await requirePageAuth("/mon-compte/demandes");
  const { reference } = await params;

  const request = await getClientRequestByReference({
    ownerId: user.id,
    reference: decodeURIComponent(reference),
  });
  if (!request) notFound();

  const canCancel = canTransitionQuoteRequest(request.status, "cancelled");

  return (
    <div className="max-w-3xl space-y-8">
      <div className="space-y-3">
        <Link
          href="/mon-compte/demandes"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Toutes mes demandes
        </Link>
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
            {request.reference}
          </h1>
          <StatusBadge
            label={quoteRequestClientLabel(request.status)}
            tone={quoteRequestTone(request.status)}
          />
        </div>
        <p className="rounded-2xl border border-slate-800 bg-slate-900 p-4 text-sm text-slate-300">
          {quoteRequestNextStep(request.status)}
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="font-bold text-white">Votre projet</h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Intervention</dt>
            <dd className="text-white">{interventionLabel(request.interventionType)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Type de toiture</dt>
            <dd className="text-white">{roofLabel(request.roofType)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Surface</dt>
            <dd className="text-white">{surfaceLabel(request.surface)}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Urgence signalée</dt>
            <dd className="text-white">{request.isUrgent ? "Oui" : "Non"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Localisation</dt>
            <dd className="text-white">
              {request.postalCode} {request.city}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Déposée le</dt>
            <dd className="text-white">
              {(request.submittedAt ?? request.createdAt).toLocaleString("fr-BE")}
            </dd>
          </div>
          {request.description && (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-slate-500">Votre description</dt>
              <dd className="whitespace-pre-wrap text-white">{request.description}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <Paperclip className="h-4 w-4 text-teal-400" />
          Pièces jointes
        </h2>
        {request.attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-4"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">
                {attachment.originalName}
              </p>
              <p className="text-xs text-slate-500">
                {Math.ceil(attachment.sizeBytes / 1024)} Ko ·{" "}
                {attachment.createdAt.toLocaleDateString("fr-BE")}
              </p>
            </div>
            <Link
              href={`/api/files/quote-attachments/${attachment.id}`}
              aria-label={`Télécharger ${attachment.originalName}`}
              className="shrink-0 rounded-xl bg-slate-800 p-3 text-brand-terracotta hover:bg-slate-700"
            >
              <Download className="h-4 w-4" />
            </Link>
          </div>
        ))}
        {request.attachments.length === 0 && (
          <p className="text-sm text-slate-500">
            Aucune pièce jointe n&apos;accompagne cette demande.
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="font-bold text-white">Suivi</h2>
        <ol className="space-y-3">
          {request.history.map((entry) => (
            <li
              key={`${entry.createdAt.toISOString()}-${entry.newStatus}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 border-l-2 border-slate-800 pl-4 text-sm"
            >
              <span className="text-white">
                {quoteRequestClientLabel(entry.newStatus)}
              </span>
              <span className="text-xs text-slate-500">
                {entry.createdAt.toLocaleString("fr-BE")}
              </span>
            </li>
          ))}
        </ol>
        {request.history.length === 0 && (
          <p className="text-sm text-slate-500">Aucune étape enregistrée pour l&apos;instant.</p>
        )}
      </section>

      {canCancel && (
        <section className="space-y-3 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <h2 className="font-bold text-white">Vous n&apos;avez plus besoin de ce devis ?</h2>
          <p className="text-sm text-slate-400">
            L&apos;annulation est définitive. Vous pourrez déposer une nouvelle demande à
            tout moment.
          </p>
          <CancelRequestButton reference={request.reference} />
        </section>
      )}
    </div>
  );
}
