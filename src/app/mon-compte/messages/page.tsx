import { desc, eq } from "drizzle-orm";
import { MessageSquare } from "lucide-react";
import { db } from "@/db/client";
import { contactMessages } from "@/db/schema/contacts";
import { requirePageAuth } from "@/lib/security/guards";

export default async function ClientMessagesPage() {
  const user = await requirePageAuth("/mon-compte/messages");
  const messages = await db
    .select({
      id: contactMessages.id,
      reference: contactMessages.reference,
      subject: contactMessages.subject,
      message: contactMessages.message,
      status: contactMessages.status,
      createdAt: contactMessages.createdAt,
      repliedAt: contactMessages.repliedAt,
    })
    .from(contactMessages)
    .where(eq(contactMessages.userId, user.id))
    .orderBy(desc(contactMessages.createdAt))
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mes messages</h1>
        <p className="text-sm text-slate-400">
          Historique durable des messages envoyés depuis votre compte.
        </p>
      </div>
      <div className="space-y-4">
        {messages.map((message) => (
          <article
            key={message.id}
            className="space-y-3 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-white">{message.reference}</p>
                <p className="text-xs text-slate-500">
                  {message.createdAt.toLocaleString("fr-BE")} · {message.subject}
                </p>
              </div>
              <span className="rounded-full border border-slate-700 bg-slate-950 px-3 py-1 text-xs">
                {message.status}
              </span>
            </div>
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
              {message.message}
            </p>
          </article>
        ))}
        {messages.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400">
            <MessageSquare className="mx-auto mb-3 h-7 w-7" />
            Aucun message n'est rattaché à votre compte.
          </div>
        )}
      </div>
    </div>
  );
}
