import React from "react";
import Link from "next/link";
import { requirePageAuth } from "@/lib/security/guards";
import {
  LayoutDashboard,
  FileText,
  Receipt,
  HardHat,
  MessageSquare,
  FolderOpen,
  Settings,
  LogOut,
  ShieldCheck,
} from "lucide-react";

export const metadata = {
  title: "Espace Client | Zlobodan Couverture Belgique",
  description: "Accédez à votre espace personnel pour suivre vos devis, factures immuables, l'avancement de votre chantier et vos documents décennaux.",
};

// Zone authentifiée : jamais de rendu statique, la session est lue à chaque requête.
export const dynamic = "force-dynamic";

export default async function ClientPortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const account = await requirePageAuth("/mon-compte");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-6 flex flex-col justify-between shrink-0">
        <div className="space-y-8">
          
          {/* Logo & Portal Badge */}
          <div className="space-y-2">
            <Link href="/" className="flex items-center gap-2.5 font-heading font-extrabold text-xl text-white">
              <div className="bg-brand-terracotta p-2 rounded-lg text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <span>ZLOBODAN</span>
            </Link>
            <span className="inline-block bg-slate-800 text-brand-terracotta text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-0.5 rounded-full border border-slate-700">
              Espace Client Belgique
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 text-sm font-medium">
            <Link
              href="/mon-compte"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <LayoutDashboard className="h-4 w-4 text-brand-terracotta" />
              <span>Tableau de bord</span>
            </Link>

            <Link
              href="/mon-compte/devis"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <FileText className="h-4 w-4 text-blue-400" />
              <span>Mes Devis</span>
            </Link>

            <Link
              href="/mon-compte/factures"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <Receipt className="h-4 w-4 text-emerald-400" />
              <span>Mes Factures</span>
            </Link>

            <Link
              href="/mon-compte/chantiers"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <HardHat className="h-4 w-4 text-amber-400" />
              <span>Mes Chantiers</span>
            </Link>

            <Link
              href="/mon-compte/messages"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <MessageSquare className="h-4 w-4 text-purple-400" />
              <span>Messagerie</span>
            </Link>

            <Link
              href="/mon-compte/documents"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <FolderOpen className="h-4 w-4 text-teal-400" />
              <span>Mes Documents</span>
            </Link>

            <Link
              href="/mon-compte/parametres"
              className="flex items-center gap-3 px-3.5 py-2.5 rounded-xl hover:bg-slate-800 text-slate-200 hover:text-white transition"
            >
              <Settings className="h-4 w-4 text-slate-400" />
              <span>Paramètres &amp; RGPD</span>
            </Link>
          </nav>

        </div>

        {/* Footer Account Info & Logout */}
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <div className="text-xs text-slate-400">
            <p className="font-bold text-white">Client Connecté</p>
            <p className="truncate">{account.email}</p>
          </div>

          <form action="/api/auth/logout" method="POST">
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-950 hover:text-red-300 text-slate-300 py-2.5 rounded-xl text-xs font-bold transition border border-slate-700"
            >
              <LogOut className="h-4 w-4" />
              <span>Se Déconnecter</span>
            </button>
          </form>
        </div>

      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-6 sm:p-10 space-y-8 overflow-y-auto">
        {children}
      </main>

    </div>
  );
}
