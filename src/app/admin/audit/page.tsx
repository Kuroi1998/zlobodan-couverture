import { desc, eq } from "drizzle-orm";
import { History, Lock } from "lucide-react";
import { db } from "@/db/client";
import { auditLog } from "@/db/schema/audit";
import { users } from "@/db/schema/users";
import { requirePageRole } from "@/lib/security/guards";

export default async function AdminAuditPage() {
  // Le layout d'administration laisse passer `staff` : c'est le bon niveau
  // pour traiter contacts et demandes, pas pour lire le journal complet, qui
  // expose les empreintes d'IP et l'activité de tous les opérateurs. Garde
  // propre à la page, conformément à docs/roles-and-permissions.md.
  await requirePageRole(["admin"], "/admin/audit");

  const rows = await db
    .select({
      id: auditLog.id,
      createdAt: auditLog.createdAt,
      userEmail: users.email,
      action: auditLog.action,
      targetTable: auditLog.targetTable,
      targetId: auditLog.targetId,
      ipHash: auditLog.ipHash,
      diff: auditLog.diff,
    })
    .from(auditLog)
    .leftJoin(users, eq(auditLog.userId, users.id))
    .orderBy(desc(auditLog.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold text-white">
            <History className="h-5 w-5 text-red-400" />
            Registre d'audit
          </h1>
          <p className="text-slate-400">Cent événements PostgreSQL les plus récents.</p>
        </div>
        <span className="flex items-center gap-1 rounded border border-red-800 bg-red-950 px-3 py-1 text-xs font-bold text-red-400">
          <Lock className="h-3.5 w-3.5" /> Lecture seule
        </span>
      </div>
      <div className="overflow-x-auto rounded border border-slate-800 bg-slate-950">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-900 text-[10px] uppercase text-slate-400">
            <tr>
              <th className="p-3">Horodatage</th>
              <th className="p-3">Utilisateur</th>
              <th className="p-3">Action</th>
              <th className="p-3">Cible</th>
              <th className="p-3">IP hachée</th>
              <th className="p-3">Détail</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="p-3 text-slate-400">{row.createdAt.toISOString()}</td>
                <td className="p-3 text-white">{row.userEmail ?? "Système"}</td>
                <td className="p-3 font-bold text-amber-400">{row.action}</td>
                <td className="p-3 text-teal-400">
                  {row.targetTable} {row.targetId ? `(${row.targetId})` : ""}
                </td>
                <td className="p-3 text-slate-500">{row.ipHash?.slice(0, 12) ?? "—"}</td>
                <td className="max-w-xs truncate p-3 text-slate-400">{row.diff ?? "—"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  Aucun événement persistant.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
