import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages, contactStatusHistory } from "@/db/schema/contacts";
import WorkflowEditor from "@/components/admin/WorkflowEditor";
import InternalNotesPanel from "@/components/admin/InternalNotesPanel";
import { allowedContactMessageTransitions } from "@/domain/request-workflow";
import { contactMessageLabel, contactSubjectLabel } from "@/domain/request-labels";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { requirePageRole } from "@/lib/security/guards";
import { listAssignableOperators } from "@/lib/db/repositories/quote-request-repository";
import { listInternalNotes } from "@/lib/services/internal-note-service";
import { buildReplyMailto } from "@/lib/services/contact-reply";

export const dynamic = "force-dynamic";

const ROUTE = "/admin/contacts/[id]";

export default async function AdminContactDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const operator = await requirePageRole(["staff", "admin"], ROUTE);

  const parsed = parseUuidParam((await params).id);
  if (!parsed.ok || !parsed.value) notFound();

  const rows = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, parsed.value))
    .limit(1);
  const message = rows[0];
  if (!message) notFound();

  const [history, assignees, notes] = await Promise.all([
    db
      .select()
      .from(contactStatusHistory)
      .where(eq(contactStatusHistory.contactMessageId, message.id))
      .orderBy(asc(contactStatusHistory.createdAt))
      .limit(100),
    listAssignableOperators(),
    listInternalNotes({
      actor: operator,
      entityType: "contact_message",
      entityId: message.id,
    }),
  ]);

  const available = [message.status, ...allowedContactMessageTransitions(message.status)];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div>
          <p className="text-brand-terracotta">{message.reference}</p>
          <h1 className="text-xl font-bold text-white">{message.fullName}</h1>
          <p className="text-slate-400">
            {message.email} · {message.phone ?? "Téléphone non fourni"}
          </p>
          {/* La réponse part du client de messagerie de l'opérateur, pas de
              l'application : l'envoi sortant nominatif, l'archivage légal et
              la délivrabilité sont hors périmètre V1. Le lien prépare
              seulement le message. Voir docs/functional-scope.md, §5.2. */}
          <a
            href={buildReplyMailto({
              email: message.email,
              reference: message.reference,
              fullName: message.fullName,
            })}
            className="mt-3 inline-block rounded bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-700"
          >
            Préparer une réponse par e-mail
          </a>
        </div>

        <section className="space-y-3 rounded border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-bold text-white">
            Message · {contactSubjectLabel(message.subject)}
          </h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {message.message}
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-bold text-white">Historique des statuts</h2>
          {history.map((item) => (
            <div key={item.id} className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="text-white">
                {item.previousStatus ? contactMessageLabel(item.previousStatus) : "Création"} →{" "}
                {contactMessageLabel(item.newStatus)}
              </p>
              <p className="text-slate-500">
                {item.createdAt.toLocaleString("fr-BE")}
                {item.reason ? ` · ${item.reason}` : ""}
              </p>
            </div>
          ))}
          {history.length === 0 && (
            <p className="text-slate-500">Aucune transition enregistrée.</p>
          )}
        </section>
      </div>

      <div className="space-y-5">
        <WorkflowEditor
          endpoint={`/api/admin/contacts/${message.id}/status`}
          currentStatus={message.status}
          initialAssigneeId={message.assignedToUserId}
          assigneeOptions={assignees}
          options={available.map((value) => ({
            value,
            label: contactMessageLabel(value),
          }))}
        />
        <InternalNotesPanel
          entityType="contact_message"
          entityId={message.id}
          notes={
            notes.outcome === "ok"
              ? notes.notes.map((note) => ({
                  id: note.id,
                  content: note.content,
                  authorEmail: note.authorEmail,
                  createdAt: note.createdAt.toLocaleString("fr-BE"),
                }))
              : []
          }
        />
      </div>
    </div>
  );
}
