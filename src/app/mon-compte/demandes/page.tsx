import Link from "next/link";
import { ArrowRight, FilePlus2, FileText, Paperclip } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { listClientRequests } from "@/lib/services/client-portal-service";
import {
  interventionLabel,
  quoteRequestClientLabel,
  quoteRequestTone,
  roofLabel,
  surfaceLabel,
} from "@/domain/request-labels";
import { isQuoteRequestStatus } from "@/domain/request-workflow";
import { PaginationSchema } from "@/lib/validations/identifiers";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

const ROUTE = "/mon-compte/demandes";
const PAGE_SIZE = 10;

export const metadata = {
  title: "Mes demandes | Espace client Zlobodan",
};

/**
 * Liste des demandes du client connecté.
 *
 * La section « devis commerciaux » a été retirée : la table `quotes` n'a aucun
 * chemin de création dans la V1, la section ne pouvait donc afficher qu'un
 * message d'absence permanent. Elle revient avec son module en V2.
 *
 * La liste est paginée côté serveur. La version précédente chargeait cent
 * lignes d'un coup, ce qui tient tant qu'un client n'a pas cent demandes — et
 * cesse de tenir sans prévenir.
 */
export default async function ClientRequestsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string; status?: string }>;
}>) {
  const user = await requirePageAuth(ROUTE);
  const query = await searchParams;

  const pagination = PaginationSchema.parse({ page: query.page, limit: PAGE_SIZE });
  const status =
    query.status && isQuoteRequestStatus(query.status) ? query.status : undefined;

  const result = await listClientRequests({
    ownerId: user.id,
    page: pagination.page,
    pageSize: pagination.limit,
    status,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mes demandes</h1>
          <p className="text-sm text-slate-400">
            Seules les demandes rattachées à votre compte sont affichées.
          </p>
        </div>
        <Link
          href="/devis"
          className="inline-flex h-fit items-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
        >
          <FilePlus2 className="h-4 w-4" />
          Nouvelle demande
        </Link>
      </div>

      <div className="space-y-4">
        {result.items.map((request) => (
          <article
            key={request.reference}
            className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-[1fr_auto] sm:items-start"
          >
            <div className="space-y-1">
              <p className="font-bold text-white">{request.reference}</p>
              <p className="text-sm text-slate-300">
                {interventionLabel(request.interventionType)} ·{" "}
                {roofLabel(request.roofType)} · {surfaceLabel(request.surface)}
              </p>
              <p className="text-xs text-slate-500">
                {request.postalCode} {request.city} · déposée le{" "}
                {request.createdAt.toLocaleDateString("fr-BE")} · mise à jour le{" "}
                {request.updatedAt.toLocaleDateString("fr-BE")}
              </p>
              {request.attachmentCount > 0 && (
                <p className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Paperclip className="h-3.5 w-3.5" />
                  {request.attachmentCount} pièce(s) jointe(s)
                </p>
              )}
            </div>
            <div className="flex flex-col items-start gap-3 sm:items-end">
              <StatusBadge
                label={quoteRequestClientLabel(request.status)}
                tone={quoteRequestTone(request.status)}
              />
              <Link
                href={`/mon-compte/demandes/${encodeURIComponent(request.reference)}`}
                className="inline-flex items-center gap-1 text-xs font-bold text-brand-terracotta hover:underline"
              >
                Voir le détail <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}

        {result.total === 0 && (
          <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <FileText className="mx-auto h-7 w-7 text-slate-500" />
            <p className="text-slate-300">Vous n&apos;avez encore envoyé aucune demande.</p>
            <p className="text-sm text-slate-500">
              Décrivez votre projet en cinq étapes, photos comprises. Nous revenons vers
              vous rapidement.
            </p>
            <Link
              href="/devis"
              className="inline-flex items-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
            >
              <FilePlus2 className="h-4 w-4" />
              Demander un devis
            </Link>
          </div>
        )}
      </div>

      <Pagination
        basePath={ROUTE}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
        params={status ? { status } : {}}
      />
    </div>
  );
}
