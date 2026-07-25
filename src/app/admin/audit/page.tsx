import React from "react";
import { History, ShieldCheck, Lock } from "lucide-react";

export default function AdminAuditPage() {
  const auditLogs = [
    {
      id: "aud-001",
      timestamp: "25/07/2026 13:42:01 UTC",
      user: "Client #8492 (Jean Peeters)",
      action: "QUOTE_ACCEPTED_ONLINE",
      table: "quotes",
      targetId: "DEV-2026-0012",
      ipHash: "8f9a2b...4c1e",
      diff: '{"status":"accepted","signedAt":"2026-07-25T13:42:01Z"}',
    },
    {
      id: "aud-002",
      timestamp: "25/07/2026 11:15:30 UTC",
      user: "Staff #01 (Admin)",
      action: "USER_REGISTER",
      table: "users",
      targetId: "usr-9921",
      ipHash: "3d4e1f...9b2a",
      diff: '{"role":"client","email":"jean.peeters@email.be"}',
    },
    {
      id: "aud-003",
      timestamp: "24/07/2026 16:20:10 UTC",
      user: "Staff #01 (Admin)",
      action: "INVOICE_ISSUED",
      table: "invoices",
      targetId: "FACT-2026-0004",
      ipHash: "3d4e1f...9b2a",
      diff: '{"number":"FACT-2026-0004","amountTtc":4850.00}',
    },
  ];

  return (
    <div className="space-y-6">
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg text-white flex items-center gap-2">
            <History className="h-5 w-5 text-red-400" />
            <span>Registre d'Audit Append-Only (Inaltérable)</span>
          </h1>
          <p className="text-slate-400">Traçabilité intégrale des événements de sécurité. Aucune modification ni suppression possible.</p>
        </div>
        <span className="bg-red-950 text-red-400 border border-red-800 px-3 py-1 rounded text-xs font-bold flex items-center gap-1">
          <Lock className="h-3.5 w-3.5" />
          <span>Lecture Seule Append-Only</span>
        </span>
      </div>

      <div className="bg-slate-950 border border-slate-800 rounded p-4">
        <table className="w-full text-left text-xs text-slate-300 border-collapse">
          <thead className="bg-slate-900 text-slate-400 uppercase font-bold text-[10px]">
            <tr>
              <th className="p-2.5 border-b border-slate-800">Horodatage UTC</th>
              <th className="p-2.5 border-b border-slate-800">Utilisateur</th>
              <th className="p-2.5 border-b border-slate-800">Action Tracée</th>
              <th className="p-2.5 border-b border-slate-800">Table Cible</th>
              <th className="p-2.5 border-b border-slate-800">IP Hachée</th>
              <th className="p-2.5 border-b border-slate-800">Diff JSON</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
            {auditLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/50">
                <td className="p-2.5 text-slate-400">{log.timestamp}</td>
                <td className="p-2.5 font-bold text-white">{log.user}</td>
                <td className="p-2.5 text-amber-400 font-bold">{log.action}</td>
                <td className="p-2.5 text-teal-400">{log.table} ({log.targetId})</td>
                <td className="p-2.5 text-slate-500">{log.ipHash}</td>
                <td className="p-2.5 text-slate-400 truncate max-w-xs">{log.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
