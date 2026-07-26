import React from "react";
import Link from "next/link";
import { requirePageRole } from "@/lib/security/guards";
import LogoutButton from "@/components/auth/LogoutButton";
import {
  LayoutDashboard,
  Inbox,
  FileText,
  Receipt,
  HardHat,
  Users,
  ShieldCheck,
  History,
} from "lucide-react";

export const metadata = {
  title: "Back-Office Administration | Zlobodan Couverture SRL",
  description: "Interface de gestion back-office sobre et dense pour la gestion des demandes de devis, création de devis, facturation immuable et audit log.",
};

// Rendu dynamique obligatoire : la garde ci-dessous lit le cookie de session,
// ce qui interdit toute mise en cache statique de cette zone.
export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Barrière verticale : aucun rôle `client` n'atteint le back-office, ni par
  // navigation, ni par accès direct à une sous-route.
  const operator = await requirePageRole(["staff", "admin"], "/admin");

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col md:flex-row font-mono text-xs">
      
      {/* Dense Sidebar */}
      <aside className="w-full md:w-56 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          
          <div className="space-y-1 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2 font-bold text-white tracking-wider">
              <ShieldCheck className="h-4 w-4 text-brand-terracotta" />
              <span>ADMIN // ZLOBODAN</span>
            </div>
            <p className="text-[10px] text-slate-500 uppercase">Back-Office Staff &amp; Admin</p>
          </div>

          <nav className="space-y-1">
            <Link
              href="/admin"
              className="flex items-center gap-2.5 px-3 py-2 rounded bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-bold"
            >
              <LayoutDashboard className="h-3.5 w-3.5 text-brand-terracotta" />
              <span>Dashboard Admin</span>
            </Link>

            <Link
              href="/admin/demandes"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <Inbox className="h-3.5 w-3.5 text-amber-400" />
              <span>Demandes de devis</span>
            </Link>

            <Link
              href="/admin/contacts"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <Inbox className="h-3.5 w-3.5 text-purple-400" />
              <span>Messages de contact</span>
            </Link>

            <Link
              href="/admin/devis"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <FileText className="h-3.5 w-3.5 text-blue-400" />
              <span>Créer / Gérer Devis</span>
            </Link>

            <Link
              href="/admin/factures"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <Receipt className="h-3.5 w-3.5 text-emerald-400" />
              <span>Facturation Immuable</span>
            </Link>

            <Link
              href="/admin/chantiers"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <HardHat className="h-3.5 w-3.5 text-orange-400" />
              <span>Gestion Chantiers</span>
            </Link>

            <Link
              href="/admin/clients"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <Users className="h-3.5 w-3.5 text-purple-400" />
              <span>Gestion Clients</span>
            </Link>

            <Link
              href="/admin/audit"
              className="flex items-center gap-2.5 px-3 py-2 rounded hover:bg-slate-800 text-slate-300 hover:text-white"
            >
              <History className="h-3.5 w-3.5 text-red-400" />
              <span>Audit Log Append-Only</span>
            </Link>
          </nav>

        </div>

        <div className="pt-4 border-t border-slate-800 space-y-2 text-[11px]">
          <p className="text-slate-400">
            Opérateur : <strong className="text-white">{operator.email}</strong>
          </p>
          <p className="text-slate-500 uppercase text-[10px]">Rôle : {operator.role}</p>
          <LogoutButton
            label="Quitter le Back-Office"
            iconClassName="h-3 w-3"
            className="w-full flex items-center justify-center gap-1 bg-slate-900 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70 text-slate-400 py-2 rounded border border-slate-800 text-[10px]"
          />
        </div>

      </aside>

      {/* Main Back-Office Content Area */}
      <main className="flex-1 p-6 space-y-6 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
