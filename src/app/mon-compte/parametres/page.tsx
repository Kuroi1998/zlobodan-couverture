import Link from "next/link";
import { and, count, eq, gt, isNull } from "drizzle-orm";
import { Download, Lock, Settings, ShieldCheck, Smartphone } from "lucide-react";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/sessions";
import { users } from "@/db/schema/users";
import { requirePageAuth } from "@/lib/security/guards";
import { siteConfig } from "@/config/site";

export default async function ClientSettingsPage() {
  const user = await requirePageAuth("/mon-compte/parametres");
  const [accounts, activeSessions] = await Promise.all([
    db
      .select({
        email: users.email,
        phone: users.phone,
        emailVerifiedAt: users.emailVerifiedAt,
        totpEnabled: users.totpEnabled,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1),
    db
      .select({ total: count() })
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, user.id),
          isNull(sessions.revokedAt),
          gt(sessions.expiresAt, new Date())
        )
      ),
  ]);
  const account = accounts[0];

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">
          Paramètres et confidentialité
        </h1>
        <p className="text-sm text-slate-400">
          Informations réelles de votre compte et accès à vos droits RGPD.
        </p>
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <Settings className="h-5 w-5 text-brand-terracotta" /> Compte
        </h2>
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-slate-500">Email</dt>
            <dd className="text-white">{account?.email ?? user.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Téléphone</dt>
            <dd className="text-white">{account?.phone ?? "Non renseigné"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Email vérifié</dt>
            <dd className="text-white">{account?.emailVerifiedAt ? "Oui" : "Non"}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-slate-500">Compte créé le</dt>
            <dd className="text-white">{account?.createdAt.toLocaleDateString("fr-BE") ?? "—"}</dd>
          </div>
        </dl>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <Smartphone className="mb-3 h-5 w-5 text-amber-400" />
          <p className="font-bold text-white">Double facteur</p>
          <p className="text-sm text-slate-400">
            {account?.totpEnabled ? "Activé sur ce compte." : "Non activé sur ce compte."}
          </p>
        </div>
        <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <Lock className="mb-3 h-5 w-5 text-blue-400" />
          <p className="font-bold text-white">Sessions actives</p>
          <p className="text-sm text-slate-400">{activeSessions[0]?.total ?? 0} session(s).</p>
        </div>
      </section>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="flex items-center gap-2 font-bold text-white">
          <ShieldCheck className="h-5 w-5 text-emerald-400" /> Droits RGPD
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href="/api/client/privacy/export"
            className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:bg-slate-800"
          >
            <Download className="mb-2 h-5 w-5 text-brand-terracotta" />
            <p className="text-xs font-bold text-white">Exporter mes données</p>
            <p className="text-[11px] text-slate-400">Archive JSON générée côté serveur.</p>
          </Link>
          <a
            href={`mailto:${siteConfig.email}?subject=Demande%20RGPD%20de%20suppression`}
            className="rounded-2xl border border-slate-800 bg-slate-950 p-4 hover:bg-slate-800"
          >
            <ShieldCheck className="mb-2 h-5 w-5 text-red-400" />
            <p className="text-xs font-bold text-white">Demander une rectification ou suppression</p>
            <p className="text-[11px] text-slate-400">
              La demande est vérifiée avant toute action irréversible.
            </p>
          </a>
        </div>
      </section>
    </div>
  );
}
