import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Receipt } from "lucide-react";
import { db } from "@/db/client";
import { invoices } from "@/db/schema/invoices";
import { quotes } from "@/db/schema/quotes";
import { users } from "@/db/schema/users";

export default async function AdminInvoicesPage() {
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      quoteNumber: quotes.number,
      clientEmail: users.email,
      amountTtc: invoices.amountTtc,
      status: invoices.status,
      issuedAt: invoices.issuedAt,
    })
    .from(invoices)
    .innerJoin(users, eq(invoices.userId, users.id))
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .orderBy(desc(invoices.issuedAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-lg font-bold text-white">
          <Receipt className="h-5 w-5 text-emerald-400" />
          Registre des factures
        </h1>
        <p className="text-slate-400">Données comptables réelles, en lecture sécurisée.</p>
      </div>
      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="p-3">Facture</th>
              <th className="p-3">Devis source</th>
              <th className="p-3">Client</th>
              <th className="p-3">Émission</th>
              <th className="p-3 text-right">TTC</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((invoice) => (
              <tr key={invoice.id}>
                <td className="p-3 font-bold text-white">{invoice.number}</td>
                <td className="p-3">{invoice.quoteNumber ?? "—"}</td>
                <td className="p-3">{invoice.clientEmail}</td>
                <td className="p-3">{invoice.issuedAt.toLocaleDateString("fr-BE")}</td>
                <td className="p-3 text-right">
                  {Number(invoice.amountTtc).toLocaleString("fr-BE")} €
                </td>
                <td className="p-3">{invoice.status}</td>
                <td className="p-3">
                  <Link
                    href={`/api/pdf/invoice/${invoice.id}`}
                    className="text-brand-terracotta hover:underline"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Aucune facture enregistrée.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
