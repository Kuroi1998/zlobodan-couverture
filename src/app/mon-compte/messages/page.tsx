import Link from "next/link";
import { MessageSquare } from "lucide-react";
import { requirePageAuth } from "@/lib/security/guards";
import { listClientExchanges } from "@/lib/db/repositories/client-content-repository";
import { contactMessageLabel, contactMessageTone, contactSubjectLabel } from "@/domain/request-labels";
import { PaginationSchema } from "@/lib/validations/identifiers";
import StatusBadge from "@/components/ui/StatusBadge";
import Pagination from "@/components/ui/Pagination";

export const dynamic = "force-dynamic";

const ROUTE = "/mon-compte/messages";
const PAGE_SIZE = 10;

export const metadata = {
  title: "Mes échanges | Espace client Zlobodan",
};

/**
 * Historique des messages envoyés depuis le compte.
 *
 * L'écran s'intitulait « Messagerie », ce qui promettait une conversation.
 * Il n'a jamais rien fait d'autre que relire `contact_messages` : aucun champ
 * de saisie, aucune réponse affichée. Le titre est corrigé, la lecture seule
 * est assumée, et l'action possible — écrire à l'entreprise — pointe vers le
 * formulaire qui, lui, fonctionne.
 *
 * Le fil de discussion rattaché à une demande est prévu en V2 : il suppose une
 * table `request_messages` et une distinction stricte entre message visible du
 * client et note interne. Voir docs/functional-scope.md, §4.8.
 */
export default async function ClientExchangesPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ page?: string }> }>) {
  const user = await requirePageAuth(ROUTE);
  const query = await searchParams;
  const pagination = PaginationSchema.parse({ page: query.page, limit: PAGE_SIZE });

  const result = await listClientExchanges({
    ownerId: user.id,
    page: pagination.page,
    pageSize: pagination.limit,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mes échanges</h1>
          <p className="text-sm text-slate-400">
            Historique des messages envoyés depuis votre compte. Nos réponses vous
            parviennent par e-mail.
          </p>
        </div>
        <Link
          href="/contact"
          className="inline-flex h-fit items-center gap-2 rounded-xl bg-brand-terracotta px-4 py-2 text-xs font-bold text-white"
        >
          <MessageSquare className="h-4 w-4" />
          Nous écrire
        </Link>
      </div>

      <div className="space-y-4">
        {result.items.map((message) => (
          <article
            key={message.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{message.reference}</p>
                <p className="text-xs text-slate-500">
                  {message.createdAt.toLocaleString("fr-BE")} ·{" "}
                  {contactSubjectLabel(message.subject)}
                  {message.repliedAt
                    ? ` · répondu le ${message.repliedAt.toLocaleDateString("fr-BE")}`
                    : ""}
                </p>
              </div>
              <StatusBadge
                label={contactMessageLabel(message.status)}
                tone={contactMessageTone(message.status)}
              />
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {message.message}
            </p>
          </article>
        ))}

        {result.total === 0 && (
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <MessageSquare className="mx-auto h-7 w-7 text-slate-500" />
            <p className="text-slate-300">Aucun message envoyé depuis votre compte.</p>
            <p className="text-sm text-slate-500">
              Les messages envoyés depuis le formulaire de contact, une fois connecté,
              apparaissent ici.
            </p>
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
