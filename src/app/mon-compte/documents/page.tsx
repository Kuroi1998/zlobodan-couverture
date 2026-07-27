import Link from "next/link";
import { Download, Eye, FileText, FolderOpen } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { listClientAttachments } from "@/lib/db/repositories/client-content-repository";
import { listDocumentsForOwner } from "@/lib/documents/repository";
import { formatFileSize } from "@/lib/pdf/format";
import { PaginationSchema } from "@/lib/validations/identifiers";
import Pagination from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

const ROUTE = "/mon-compte/documents";
const PAGE_SIZE = 12;
const DOCUMENTS_PAGE_SIZE = 20;

export const metadata = {
  title: "Mes documents | Espace client Zlobodan",
};

/**
 * Documents du client.
 *
 * L'écran ne montrait que les pièces jointes déposées par le client, alors que
 * son titre — « Mes documents » — laissait attendre des documents émis par
 * l'entreprise. Le titre avait donc été corrigé en « Mes pièces jointes », par
 * honnêteté, en attendant qu'il existe quelque chose à montrer.
 *
 * C'est désormais le cas : les récapitulatifs de demande générés côté serveur
 * apparaissent au-dessus. Les deux blocs restent distincts parce qu'ils n'ont
 * ni la même origine ni le même statut — l'un est produit et versionné par
 * l'entreprise, l'autre est déposé par le client.
 *
 * La liste des documents émis provient de `listDocumentsForOwner`, qui porte la
 * propriété dans sa clause `where` et exclut les versions non publiées : un
 * document en cours de génération ou en échec n'apparaît pas.
 */
export default async function ClientDocumentsPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  const user = await requirePageAuth(ROUTE);
  const query = await searchParams;
  const pagination = PaginationSchema.parse({ page: query.page, limit: PAGE_SIZE });

  const [result, emitted] = await Promise.all([
    listClientAttachments({
      ownerId: user.id,
      page: pagination.page,
      pageSize: pagination.limit,
    }),
    listDocumentsForOwner({
      ownerUserId: user.id,
      page: 1,
      pageSize: DOCUMENTS_PAGE_SIZE,
    }),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Mes documents
        </h1>
        <p className="text-sm text-slate-400">
          Documents établis par Zlobodan et fichiers que vous avez joints à vos
          demandes. Stockage privé, accessible à vous seul.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-lg font-bold text-white">Documents établis</h2>

        {emitted.items.length === 0 ? (
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <FileText className="mx-auto h-7 w-7 text-slate-500" />
            <p className="text-slate-300">Aucun document établi pour le moment.</p>
            <p className="text-sm text-slate-500">
              Les récapitulatifs de vos demandes apparaîtront ici dès qu'ils
              seront émis.
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {emitted.items.map((document) => (
              <li
                key={document.publicId}
                className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
              >
                <div className="min-w-0">
                  <p className="truncate font-bold text-white">{document.title}</p>
                  <p className="text-xs text-slate-500">
                    {document.reference} · version {document.versionNumber} ·{" "}
                    {document.createdAt.toLocaleDateString("fr-BE")}
                    {document.sizeBytes !== null
                      ? ` · ${formatFileSize(document.sizeBytes)}`
                      : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Link
                    href={`/api/documents/${document.publicId}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Consulter ${document.title}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700"
                  >
                    <Eye className="h-4 w-4" /> Consulter
                  </Link>
                  <Link
                    href={`/api/documents/${document.publicId}/download`}
                    aria-label={`Télécharger ${document.title}`}
                    className="inline-flex items-center gap-1 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-brand-terracotta hover:bg-slate-700"
                  >
                    <Download className="h-4 w-4" /> Télécharger
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <h2 className="text-lg font-bold text-white">Mes pièces jointes</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {result.items.map((attachment) => (
          <article
            key={attachment.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{attachment.originalName}</p>
              <p className="text-xs text-slate-500">
                <Link
                  href={`/mon-compte/demandes/${encodeURIComponent(
                    attachment.requestReference
                  )}`}
                  className="hover:underline"
                >
                  {attachment.requestReference}
                </Link>{" "}
                · {Math.ceil(attachment.sizeBytes / 1024)} Ko ·{" "}
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
          </article>
        ))}

        {result.total === 0 && (
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center sm:col-span-2">
            <FolderOpen className="mx-auto h-7 w-7 text-slate-500" />
            <p className="text-slate-300">Aucune pièce jointe pour le moment.</p>
            <p className="text-sm text-slate-500">
              Les photos que vous joignez à une demande apparaissent ici.
            </p>
            <Link href="/devis" className="text-xs font-bold text-brand-terracotta hover:underline">
              Déposer une demande
            </Link>
          </div>
        )}
      </div>

      <Pagination
        basePath={ROUTE}
        page={result.page}
        pageCount={result.pageCount}
        total={result.total}
      />
    </div>
  );
}
