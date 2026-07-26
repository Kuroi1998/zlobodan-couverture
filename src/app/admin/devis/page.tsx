import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText } from "lucide-react";
import { db } from "@/db/client";
import { quoteRequests, quotes } from "@/db/schema/quotes";

export default async function AdminQuotesPage() {
  const rows = await db
    .select({
      id: quotes.id,
      number: quotes.number,
      status: quotes.status,
      amountHt: quotes.amountHt,
      vatAmount: quotes.vatAmount,
      amountTtc: quotes.amountTtc,
      validUntil: quotes.validUntil,
      createdAt: quotes.createdAt,
      requestReference: quoteRequests.reference,
      clientName: quoteRequests.fullName,
    })
    .from(quotes)
    .leftJoin(quoteRequests, eq(quotes.quoteRequestId, quoteRequests.id))
    .orderBy(desc(quotes.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-white">
          <FileText className="h-5 w-5 text-brand-terracotta" />
          Devis commerciaux
        </h1>
        <p className="text-slate-400">
          Propositions chiffrées distinctes des demandes initiales des clients.
        </p>
      </div>
      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="p-3">Numéro</th>
              <th className="p-3">Demande source</th>
              <th className="p-3">Client</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Total TTC</th>
              <th className="p-3 text-right">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((quote) => (
              <tr key={quote.id}>
                <td className="p-3 font-bold text-white">{quote.number}</td>
                <td className="p-3">{quote.requestReference ?? "—"}</td>
                <td className="p-3">{quote.clientName ?? "Compte client"}</td>
                <td className="p-3">{quote.status}</td>
                <td className="p-3 text-right">
                  {Number(quote.amountTtc).toLocaleString("fr-BE")} €
                </td>
                <td className="p-3 text-right">
                  <Link
                    href={`/api/pdf/quote/${quote.id}`}
                    className="text-brand-terracotta hover:underline"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun devis commercial n'a encore été créé. Les demandes à traiter se trouvent
                  dans la rubrique « Demandes de devis ».
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
