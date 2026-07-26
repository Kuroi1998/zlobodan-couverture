import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Download, Receipt, ShieldCheck } from "lucide-react";
import { db } from "@/db/client";
import { invoices } from "@/db/schema/invoices";
import { quotes } from "@/db/schema/quotes";
import { requirePageAuth } from "@/lib/security/guards";

export default async function ClientInvoicesPage() {
  const user = await requirePageAuth("/mon-compte/factures");
  const rows = await db
    .select({
      id: invoices.id,
      number: invoices.number,
      quoteNumber: quotes.number,
      issuedAt: invoices.issuedAt,
      dueAt: invoices.dueAt,
      amountTtc: invoices.amountTtc,
      status: invoices.status,
    })
    .from(invoices)
    .leftJoin(quotes, eq(invoices.quoteId, quotes.id))
    .where(eq(invoices.userId, user.id))
    .orderBy(desc(invoices.issuedAt))
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mes factures</h1>
        <p className="text-sm text-slate-400">Registre comptable associé à votre compte.</p>
      </div>
      <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900 p-4 text-xs text-slate-300">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
        Une facture émise est corrigée par un avoir et n'est jamais réécrite.
      </div>
      <div className="overflow-x-auto rounded-3xl border border-slate-800 bg-slate-900">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="border-b border-slate-800 bg-slate-950 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="p-4">Facture</th>
              <th className="p-4">Devis</th>
              <th className="p-4">Émission</th>
              <th className="p-4">Échéance</th>
              <th className="p-4 text-right">TTC</th>
              <th className="p-4">Statut</th>
              <th className="p-4">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((invoice) => (
              <tr key={invoice.id}>
                <td className="p-4 font-bold text-white">{invoice.number}</td>
                <td className="p-4">{invoice.quoteNumber ?? "—"}</td>
                <td className="p-4">{invoice.issuedAt.toLocaleDateString("fr-BE")}</td>
                <td className="p-4">{invoice.dueAt.toLocaleDateString("fr-BE")}</td>
                <td className="p-4 text-right font-bold text-white">
                  {Number(invoice.amountTtc).toLocaleString("fr-BE")} €
                </td>
                <td className="p-4">{invoice.status}</td>
                <td className="p-4">
                  <Link
                    href={`/api/pdf/invoice/${invoice.id}`}
                    className="inline-flex items-center gap-1 text-brand-terracotta hover:underline"
                  >
                    <Download className="h-4 w-4" /> Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  <Receipt className="mx-auto mb-3 h-7 w-7" />
                  Aucune facture n'est rattachée à votre compte.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
