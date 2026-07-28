import Link from "next/link";
import { and, desc, eq, ilike, or, sql, type SQL } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteRequests } from "@/db/schema/quotes";
import { isQuoteRequestStatus } from "@/domain/request-workflow";
import {
  interventionLabel,
  quoteRequestFilterOptions,
  quoteRequestLabel,
} from "@/domain/request-labels";
import { PaginationSchema, SearchTermSchema } from "@/lib/validations/identifiers";
import { requirePageRole } from "@/lib/security/guards";

export const dynamic = "force-dynamic";

function pageHref(page: number, status: string, search: string): string {
  const query = new URLSearchParams();
  query.set("page", String(page));
  if (status) query.set("status", status);
  if (search) query.set("q", search);
  return `/admin/demandes?${query.toString()}`;
}

export default async function AdminQuoteRequestsPage({
  searchParams,
}: Readonly<{
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}>) {
  await requirePageRole(["staff", "admin"], "/admin/demandes");
  const query = await searchParams;
  const pagination = PaginationSchema.parse({ page: query.page, limit: 20 });
  const status = query.status && isQuoteRequestStatus(query.status) ? query.status : "";
  const search = SearchTermSchema.catch("").parse(query.q ?? "");
  const conditions: SQL[] = [];
  if (status) conditions.push(eq(quoteRequests.status, status));
  if (search) {
    const pattern = `%${search}%`;
    const searchCondition = or(
      ilike(quoteRequests.reference, pattern),
      ilike(quoteRequests.fullName, pattern),
      ilike(quoteRequests.email, pattern),
      ilike(quoteRequests.city, pattern)
    );
    if (searchCondition) conditions.push(searchCondition);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [rows, totalRows] = await Promise.all([
    db
      // Projection explicite : `select()` rapportait les vingt-trois colonnes,
      // dont `submission_key` et les champs de consentement, pour en afficher
      // huit. Une colonne chargée est une colonne qui peut finir sérialisée.
      .select({
        id: quoteRequests.id,
        reference: quoteRequests.reference,
        fullName: quoteRequests.fullName,
        email: quoteRequests.email,
        postalCode: quoteRequests.postalCode,
        city: quoteRequests.city,
        interventionType: quoteRequests.interventionType,
        isUrgent: quoteRequests.isUrgent,
        status: quoteRequests.status,
        createdAt: quoteRequests.createdAt,
      })
      .from(quoteRequests)
      .where(where)
      .orderBy(desc(quoteRequests.createdAt))
      .limit(pagination.limit)
      .offset((pagination.page - 1) * pagination.limit),
    db.select({ count: sql<number>`count(*)::int` }).from(quoteRequests).where(where),
  ]);
  const total = totalRows[0]?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pagination.limit));

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-white">Demandes de devis</h1>
        <p className="text-slate-400">{total} demande(s) persistante(s) dans PostgreSQL.</p>
      </div>
      <form className="grid gap-3 rounded border border-slate-800 bg-slate-950 p-4 sm:grid-cols-[1fr_210px_auto]">
        <input
          name="q"
          defaultValue={search}
          maxLength={120}
          placeholder="Référence, nom, email ou ville"
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        />
        <select
          name="status"
          defaultValue={status}
          className="rounded border border-slate-700 bg-slate-900 px-3 py-2 text-white"
        >
          <option value="">Tous les statuts</option>
          {quoteRequestFilterOptions().map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <button className="rounded bg-slate-800 px-4 py-2 font-bold text-white">Filtrer</button>
      </form>
      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="p-3">Créée le</th>
              <th className="p-3">Référence</th>
              <th className="p-3">Client</th>
              <th className="p-3">Lieu</th>
              <th className="p-3">Intervention</th>
              <th className="p-3">Statut</th>
              <th className="p-3 text-right">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 text-slate-400">{row.createdAt.toLocaleString("fr-BE")}</td>
                <td className="p-3 font-bold text-white">{row.reference}</td>
                <td className="p-3">
                  {row.fullName}
                  <br />
                  <span className="text-slate-500">{row.email}</span>
                </td>
                <td className="p-3">
                  {row.postalCode} {row.city}
                </td>
                <td className="p-3">
                  {interventionLabel(row.interventionType)}
                  {row.isUrgent ? " · URGENT" : ""}
                </td>
                <td className="p-3">{quoteRequestLabel(row.status)}</td>
                <td className="p-3 text-right">
                  <Link
                    href={`/admin/demandes/${row.id}`}
                    className="font-bold text-brand-terracotta hover:underline"
                  >
                    Ouvrir
                  </Link>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  Aucune demande pour ces critères.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-slate-500">
          Page {pagination.page} / {pages}
        </span>
        <div className="flex gap-2">
          {pagination.page > 1 && (
            <Link
              href={pageHref(pagination.page - 1, status, search)}
              className="rounded bg-slate-800 px-3 py-2 text-white"
            >
              Précédent
            </Link>
          )}
          {pagination.page < pages && (
            <Link
              href={pageHref(pagination.page + 1, status, search)}
              className="rounded bg-slate-800 px-3 py-2 text-white"
            >
              Suivant
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
