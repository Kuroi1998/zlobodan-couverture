import Link from "next/link";
import { AlertTriangle, Inbox, UserX } from "lucide-react";
import { getAdminDashboard } from "@/lib/services/admin-dashboard-service";
import {
  contactMessageLabel,
  contactSubjectLabel,
  interventionLabel,
  quoteRequestLabel,
} from "@/domain/request-labels";
import { requirePageRole } from "@/lib/security/guards";

export const dynamic = "force-dynamic";

/**
 * Tableau de bord du back-office.
 *
 * Quatre tuiles ont été retirées — « devis commerciaux émis », « € HT »,
 * « chantiers actifs », « € à encaisser ». Elles interrogeaient bien
 * PostgreSQL, mais sur `quotes`, `invoices` et `projects`, trois tables
 * qu'aucun chemin d'écriture de la V1 n'alimente : elles ne pouvaient afficher
 * que zéro. Un indicateur structurellement nul n'informe pas, il rassure à
 * tort. Voir docs/functional-scope.md, §5.1.
 */
export default async function AdminDashboardPage() {
  await requirePageRole(["staff", "admin"], "/admin");
  const dashboard = await getAdminDashboard();

  const tiles = [
    {
      label: "Demandes à traiter",
      value: dashboard.requests.active,
      detail: `${dashboard.requests.total} demande(s) au total`,
      accent: "text-amber-400",
      href: "/admin/demandes",
    },
    {
      label: "Contacts non lus",
      value: dashboard.contacts.unread,
      detail: `${dashboard.contacts.total} message(s) au total`,
      accent: "text-purple-400",
      href: "/admin/contacts?status=new",
    },
    {
      label: "Demandes urgentes",
      value: dashboard.requests.urgent,
      detail: "Signalées urgentes et non clôturées",
      accent: "text-red-400",
      href: "/admin/demandes",
    },
    {
      label: "Sans responsable",
      value: dashboard.requests.unassigned,
      detail: "Dossiers actifs non affectés",
      accent: "text-teal-400",
      href: "/admin/demandes",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <Link
            key={tile.label}
            href={tile.href}
            className="space-y-1 rounded border border-slate-800 bg-slate-950 p-4 hover:border-slate-700"
          >
            <span className="text-[10px] uppercase text-slate-500">{tile.label}</span>
            <p className={`text-2xl font-bold ${tile.accent}`}>{tile.value}</p>
            <p className="text-[10px] text-slate-400">{tile.detail}</p>
          </Link>
        ))}
      </div>

      {dashboard.oldestUnread.length > 0 && (
        <div className="space-y-3 rounded border border-purple-900 bg-slate-950 p-4">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <AlertTriangle className="h-4 w-4 text-purple-400" />
            Contacts en attente les plus anciens
          </h2>
          <ul className="divide-y divide-slate-800">
            {dashboard.oldestUnread.map((row) => (
              <li key={row.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <p className="truncate text-white">
                    {row.reference} · {row.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    {contactSubjectLabel(row.subject)} ·{" "}
                    {row.createdAt.toLocaleString("fr-BE")} · {contactMessageLabel(row.status)}
                  </p>
                </div>
                <Link
                  href={`/admin/contacts/${row.id}`}
                  className="shrink-0 rounded bg-slate-800 px-3 py-1 font-bold text-white"
                >
                  Ouvrir
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-3 rounded border border-slate-800 bg-slate-950 p-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-sm font-bold text-white">
            <Inbox className="h-4 w-4 text-amber-400" />
            Dernières demandes de devis
          </h2>
          <Link href="/admin/demandes" className="text-xs text-brand-terracotta hover:underline">
            Toutes les demandes
          </Link>
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
                <th className="p-3">Statut</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {dashboard.latest.map((row) => (
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
                    {interventionLabel(row.interventionType)}
                    {row.isUrgent ? " · URGENT" : ""}
                  </td>
                  <td className="p-3">{quoteRequestLabel(row.status)}</td>
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
              {dashboard.latest.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    <UserX className="mx-auto mb-3 h-6 w-6" />
                    Aucune demande enregistrée pour le moment.
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
