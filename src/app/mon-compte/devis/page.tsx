import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Download, FileText } from "lucide-react";
import { db } from "@/db/client";
import { quoteRequests, quotes } from "@/db/schema/quotes";
import { requirePageAuth } from "@/lib/security/guards";
import QuoteDecisionButtons from "@/components/account/QuoteDecisionButtons";

export default async function ClientQuotesPage() {
  const user = await requirePageAuth("/mon-compte/devis");
  const [requests, commercialQuotes] = await Promise.all([
    db
      .select({
        id: quoteRequests.id,
        reference: quoteRequests.reference,
        status: quoteRequests.status,
        interventionType: quoteRequests.interventionType,
        roofType: quoteRequests.roofType,
        surface: quoteRequests.surface,
        city: quoteRequests.city,
        createdAt: quoteRequests.createdAt,
      })
      .from(quoteRequests)
      .where(eq(quoteRequests.userId, user.id))
      .orderBy(desc(quoteRequests.createdAt))
      .limit(100),
    db
      .select({
        id: quotes.id,
        number: quotes.number,
        status: quotes.status,
        amountHt: quotes.amountHt,
        vatAmount: quotes.vatAmount,
        amountTtc: quotes.amountTtc,
        validUntil: quotes.validUntil,
        createdAt: quotes.createdAt,
      })
      .from(quotes)
      .where(eq(quotes.userId, user.id))
      .orderBy(desc(quotes.createdAt))
      .limit(100),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Mes demandes et devis
        </h1>
        <p className="text-sm text-slate-400">
          Seules les demandes rattachées à votre compte authentifié sont affichées.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <FileText className="h-5 w-5 text-brand-terracotta" />
          Demandes initiales
        </h2>
        {requests.map((request) => (
          <article
            key={request.id}
            className="grid gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-5 sm:grid-cols-[1fr_auto]"
          >
            <div>
              <p className="font-bold text-white">{request.reference}</p>
              <p className="text-sm text-slate-300">
                {request.interventionType} · {request.roofType} · {request.surface}
              </p>
              <p className="text-xs text-slate-500">
                {request.city} · enregistrée le {request.createdAt.toLocaleString("fr-BE")}
              </p>
            </div>
            <span className="h-fit rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs text-slate-300">
              {request.status}
            </span>
          </article>
        ))}
        {requests.length === 0 && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            Aucune demande n'est encore rattachée à ce compte.
          </p>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="font-bold text-white">Devis commerciaux reçus</h2>
        {commercialQuotes.map((quote) => (
          <article
            key={quote.id}
            className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row">
              <div>
                <p className="font-bold text-white">{quote.number}</p>
                <p className="text-xs text-slate-500">
                  Émis le {quote.createdAt.toLocaleDateString("fr-BE")} · valable jusqu'au{" "}
                  {quote.validUntil.toLocaleDateString("fr-BE")}
                </p>
              </div>
              <span className="h-fit rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs">
                {quote.status}
              </span>
            </div>
            <div className="grid gap-2 text-sm sm:grid-cols-3">
              <p>HT : {Number(quote.amountHt).toLocaleString("fr-BE")} €</p>
              <p>TVA : {Number(quote.vatAmount).toLocaleString("fr-BE")} €</p>
              <p className="font-bold text-brand-terracotta">
                TTC : {Number(quote.amountTtc).toLocaleString("fr-BE")} €
              </p>
            </div>
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <Link
                href={`/api/pdf/quote/${quote.id}`}
                className="flex items-center gap-2 text-xs font-bold text-brand-terracotta hover:underline"
              >
                <Download className="h-4 w-4" />
                Ouvrir le document
              </Link>
              {quote.status === "sent" && <QuoteDecisionButtons quoteId={quote.id} />}
            </div>
          </article>
        ))}
        {commercialQuotes.length === 0 && (
          <p className="rounded-2xl border border-slate-800 bg-slate-900 p-5 text-slate-400">
            Aucun devis commercial n'a encore été émis pour votre compte.
          </p>
        )}
      </section>
    </div>
  );
}
