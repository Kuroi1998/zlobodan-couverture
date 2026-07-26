import Link from "next/link";
import { desc, sql } from "drizzle-orm";
import { Inbox } from "lucide-react";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteRequests, quotes } from "@/db/schema/quotes";
import { invoices } from "@/db/schema/invoices";
import { projects } from "@/db/schema/projects";

export default async function AdminDashboardPage() {
  const [contactStats, requestStats, quoteStats, invoiceStats, projectStats, recent] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          newCount: sql<number>`count(*) filter (where ${contactMessages.status} = 'new')::int`,
        })
        .from(contactMessages),
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${quoteRequests.status} not in ('cancelled','archived','rejected','accepted'))::int`,
        })
        .from(quoteRequests),
      db
        .select({
          sent: sql<number>`count(*) filter (where ${quotes.status} = 'sent')::int`,
          amount: sql<string>`coalesce(sum(${quotes.amountHt}) filter (where ${quotes.status} = 'sent'), 0)::text`,
        })
        .from(quotes),
      db
        .select({
          due: sql<string>`coalesce(sum(${invoices.amountTtc}) filter (where ${invoices.status} in ('issued','overdue')), 0)::text`,
        })
        .from(invoices),
      db
        .select({
          active: sql<number>`count(*) filter (where ${projects.status} in ('planned','in_progress'))::int`,
        })
        .from(projects),
      db
        .select({
          id: quoteRequests.id,
          reference: quoteRequests.reference,
          fullName: quoteRequests.fullName,
          phone: quoteRequests.phone,
          postalCode: quoteRequests.postalCode,
          city: quoteRequests.city,
          interventionType: quoteRequests.interventionType,
          isUrgent: quoteRequests.isUrgent,
          createdAt: quoteRequests.createdAt,
        })
        .from(quoteRequests)
        .orderBy(desc(quoteRequests.createdAt))
        .limit(10),
    ]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] uppercase text-slate-500">Demandes entrantes</span>
          <p className="text-2xl font-bold text-amber-400">{requestStats[0]?.active ?? 0}</p>
          <p className="text-[10px] text-slate-400">
            {requestStats[0]?.total ?? 0} demande(s) au total
          </p>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] uppercase text-slate-500">Contacts non lus</span>
          <p className="text-2xl font-bold text-purple-400">{contactStats[0]?.newCount ?? 0}</p>
          <p className="text-[10px] text-slate-400">
            {contactStats[0]?.total ?? 0} message(s) au total
          </p>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] uppercase text-slate-500">Devis commerciaux émis</span>
          <p className="text-2xl font-bold text-blue-400">{quoteStats[0]?.sent ?? 0}</p>
          <p className="text-[10px] text-slate-400">
            {Number(quoteStats[0]?.amount ?? 0).toLocaleString("fr-BE")} € HT
          </p>
        </div>
        <div className="space-y-1 rounded border border-slate-800 bg-slate-950 p-4">
          <span className="text-[10px] uppercase text-slate-500">Exploitation</span>
          <p className="text-2xl font-bold text-orange-400">{projectStats[0]?.active ?? 0}</p>
          <p className="text-[10px] text-slate-400">
            Chantiers actifs · {Number(invoiceStats[0]?.due ?? 0).toLocaleString("fr-BE")} € à encaisser
          </p>
        </div>
      </div>

      <div className="space-y-3 rounded border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Inbox className="h-4 w-4 text-amber-400" />
            Dernières demandes de devis
          </h2>
          <div className="flex gap-3">
            <Link href="/admin/contacts" className="text-xs text-purple-400 hover:underline">
              Contacts
            </Link>
            <Link href="/admin/demandes" className="text-xs text-brand-terracotta hover:underline">
              Toutes les demandes
            </Link>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
              <tr>
                <th className="p-3">Date</th>
                <th className="p-3">Référence</th>
                <th className="p-3">Contact</th>
                <th className="p-3">Lieu</th>
                <th className="p-3">Intervention</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {recent.map((row) => (
                <tr key={row.id}>
                  <td className="p-3 text-slate-400">{row.createdAt.toLocaleString("fr-BE")}</td>
                  <td className="p-3 font-bold text-white">{row.reference}</td>
                  <td className="p-3">
                    {row.fullName}
                    <br />
                    <span className="text-slate-500">{row.phone}</span>
                  </td>
                  <td className="p-3">
                    {row.postalCode} {row.city}
                  </td>
                  <td className="p-3">
                    {row.interventionType}
                    {row.isUrgent ? " · URGENT" : ""}
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/admin/demandes/${row.id}`}
                      className="rounded bg-brand-terracotta px-3 py-1 font-bold text-white"
                    >
                      Ouvrir
                    </Link>
                  </td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    Aucune demande enregistrée.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
