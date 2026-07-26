import Link from "next/link";
import { desc, eq, sql } from "drizzle-orm";
import {
  ArrowRight,
  FileText,
  FolderOpen,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { quoteAttachments, quoteRequests, quotes } from "@/db/schema/quotes";
import { requirePageAuth } from "@/lib/security/guards";

export default async function ClientDashboardPage() {
  const user = await requirePageAuth("/mon-compte");
  const [requestStats, quoteStats, messageStats, attachmentStats, latestRequests] =
    await Promise.all([
      db
        .select({
          total: sql<number>`count(*)::int`,
          active: sql<number>`count(*) filter (where ${quoteRequests.status} not in ('accepted','rejected','cancelled','archived'))::int`,
        })
        .from(quoteRequests)
        .where(eq(quoteRequests.userId, user.id)),
      db
        .select({
          total: sql<number>`count(*)::int`,
          awaiting: sql<number>`count(*) filter (where ${quotes.status} = 'sent')::int`,
        })
        .from(quotes)
        .where(eq(quotes.userId, user.id)),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(contactMessages)
        .where(eq(contactMessages.userId, user.id)),
      db
        .select({ total: sql<number>`count(*)::int` })
        .from(quoteAttachments)
        .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
        .where(eq(quoteRequests.userId, user.id)),
      db
        .select({
          id: quoteRequests.id,
          reference: quoteRequests.reference,
          status: quoteRequests.status,
          interventionType: quoteRequests.interventionType,
          city: quoteRequests.city,
          createdAt: quoteRequests.createdAt,
        })
        .from(quoteRequests)
        .where(eq(quoteRequests.userId, user.id))
        .orderBy(desc(quoteRequests.createdAt))
        .limit(5),
    ]);

  const cards = [
    {
      label: "Demandes actives",
      value: requestStats[0]?.active ?? 0,
      detail: `${requestStats[0]?.total ?? 0} au total`,
      href: "/mon-compte/devis",
      icon: <FileText className="h-5 w-5 text-amber-400" />,
    },
    {
      label: "Devis à examiner",
      value: quoteStats[0]?.awaiting ?? 0,
      detail: `${quoteStats[0]?.total ?? 0} devis commercial(aux)`,
      href: "/mon-compte/devis",
      icon: <ShieldCheck className="h-5 w-5 text-brand-terracotta" />,
    },
    {
      label: "Messages envoyés",
      value: messageStats[0]?.total ?? 0,
      detail: "Historique de contact",
      href: "/mon-compte/messages",
      icon: <MessageSquare className="h-5 w-5 text-purple-400" />,
    },
    {
      label: "Pièces jointes",
      value: attachmentStats[0]?.total ?? 0,
      detail: "Stockage privé",
      href: "/mon-compte/documents",
      icon: <FolderOpen className="h-5 w-5 text-teal-400" />,
    },
  ];

  return (
    <div className="space-y-8">
      <div className="relative space-y-3 overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-r from-slate-900 to-slate-800 p-8">
        <div className="absolute right-0 top-0 p-8 opacity-10">
          <ShieldCheck className="h-40 w-40 text-brand-terracotta" />
        </div>
        <span className="inline-block rounded-full border border-brand-terracotta/30 bg-brand-terracotta/20 px-3 py-1 text-xs font-extrabold uppercase tracking-widest text-brand-terracotta">
          Compte vérifié
        </span>
        <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-4xl">
          Votre espace client
        </h1>
        <p className="max-w-2xl text-sm text-slate-400">{user.email}</p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <article key={card.label} className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-slate-400">{card.label}</span>
              {card.icon}
            </div>
            <p className="text-3xl font-extrabold text-white">{card.value}</p>
            <p className="text-xs text-slate-500">{card.detail}</p>
            <Link
              href={card.href}
              className="inline-flex items-center gap-1 text-xs font-bold text-brand-terracotta hover:underline"
            >
              Consulter <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </article>
        ))}
      </div>

      <section className="space-y-4 rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="font-bold text-white">Demandes récentes</h2>
        {latestRequests.map((request) => (
          <div
            key={request.id}
            className="flex flex-col justify-between gap-2 rounded-2xl border border-slate-800 bg-slate-950 p-4 sm:flex-row"
          >
            <div>
              <p className="font-bold text-white">
                {request.reference} · {request.interventionType}
              </p>
              <p className="text-xs text-slate-500">
                {request.city} · {request.createdAt.toLocaleDateString("fr-BE")}
              </p>
            </div>
            <span className="text-xs text-slate-300">{request.status}</span>
          </div>
        ))}
        {latestRequests.length === 0 && (
          <p className="text-sm text-slate-500">Aucune demande rattachée à votre compte.</p>
        )}
      </section>
    </div>
  );
}
