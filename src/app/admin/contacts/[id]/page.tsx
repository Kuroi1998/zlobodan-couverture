import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { contactMessages, contactStatusHistory } from "@/db/schema/contacts";
import { users } from "@/db/schema/users";
import WorkflowEditor from "@/components/admin/WorkflowEditor";
import {
  allowedContactMessageTransitions,
  type ContactMessageStatus,
} from "@/domain/request-workflow";
import { parseUuidParam } from "@/lib/validations/identifiers";

const LABELS: Record<ContactMessageStatus, string> = {
  new: "Nouveau",
  read: "Lu",
  in_progress: "En cours",
  replied: "Répondu",
  closed: "Clôturé",
  archived: "Archivé",
  spam: "Indésirable",
};

export default async function AdminContactDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const parsed = parseUuidParam((await params).id);
  if (!parsed.ok || !parsed.value) notFound();

  const rows = await db
    .select()
    .from(contactMessages)
    .where(eq(contactMessages.id, parsed.value))
    .limit(1);
  const message = rows[0];
  if (!message) notFound();

  const [history, assignees] = await Promise.all([
    db
      .select()
      .from(contactStatusHistory)
      .where(eq(contactStatusHistory.contactMessageId, message.id))
      .orderBy(asc(contactStatusHistory.createdAt)),
    db
      .select({ value: users.id, label: users.email })
      .from(users)
      .where(
        and(
          inArray(users.role, ["staff", "admin"]),
          isNull(users.deletedAt)
        )
      )
      .orderBy(asc(users.email)),
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
        </div>
        <section className="space-y-3 rounded border border-slate-800 bg-slate-950 p-5">
          <h2 className="font-bold text-white">Message · {message.subject}</h2>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {message.message}
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-bold text-white">Historique des statuts</h2>
          {history.map((item) => (
            <div key={item.id} className="rounded border border-slate-800 bg-slate-950 p-3">
              <p className="text-white">
                {item.previousStatus ? LABELS[item.previousStatus] : "Création"} →{" "}
                {LABELS[item.newStatus]}
              </p>
              <p className="text-slate-500">
                {item.createdAt.toLocaleString("fr-BE")}
                {item.reason ? ` · ${item.reason}` : ""}
              </p>
            </div>
          ))}
        </section>
      </div>
      <WorkflowEditor
        endpoint={`/api/admin/contacts/${message.id}/status`}
        currentStatus={message.status}
        initialNotes={message.internalNotes}
        initialAssigneeId={message.assignedToUserId}
        assigneeOptions={assignees}
        options={available.map((value) => ({ value, label: LABELS[value] }))}
      />
    </div>
  );
}
