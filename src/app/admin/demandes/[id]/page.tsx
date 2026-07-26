import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import {
  quoteAttachments,
  quoteRequests,
  quoteStatusHistory,
} from "@/db/schema/quotes";
import { users } from "@/db/schema/users";
import WorkflowEditor from "@/components/admin/WorkflowEditor";
import {
  allowedQuoteRequestTransitions,
  type QuoteRequestStatus,
} from "@/domain/request-workflow";
import { parseUuidParam } from "@/lib/validations/identifiers";

const LABELS: Record<QuoteRequestStatus, string> = {
  draft: "Brouillon",
  submitted: "Soumise",
  under_review: "À étudier",
  contacted: "Contactée",
  visit_scheduled: "Visite planifiée",
  estimate_in_preparation: "Devis en préparation",
  estimate_sent: "Devis envoyé",
  accepted: "Acceptée",
  rejected: "Refusée",
  cancelled: "Annulée",
  archived: "Archivée",
};

export default async function AdminQuoteRequestDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const parsed = parseUuidParam((await params).id);
  if (!parsed.ok || !parsed.value) notFound();

  const rows = await db
    .select()
    .from(quoteRequests)
    .where(eq(quoteRequests.id, parsed.value))
    .limit(1);
  const request = rows[0];
  if (!request) notFound();

  const [history, attachments, assignees] = await Promise.all([
    db
      .select()
      .from(quoteStatusHistory)
      .where(eq(quoteStatusHistory.quoteRequestId, request.id))
      .orderBy(asc(quoteStatusHistory.createdAt)),
    db
      .select()
      .from(quoteAttachments)
      .where(eq(quoteAttachments.quoteRequestId, request.id))
      .orderBy(asc(quoteAttachments.createdAt)),
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
  const available = [request.status, ...allowedQuoteRequestTransitions(request.status)];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="space-y-5">
        <div>
          <p className="text-brand-terracotta">{request.reference}</p>
          <h1 className="text-xl font-bold text-white">{request.fullName}</h1>
          <p className="text-slate-400">
            {request.email} · {request.phone} · {request.postalCode} {request.city}
          </p>
        </div>
        <section className="grid gap-3 rounded border border-slate-800 bg-slate-950 p-5 sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Intervention :</span> {request.interventionType}
          </p>
          <p>
            <span className="text-slate-500">Toiture :</span> {request.roofType}
          </p>
          <p>
            <span className="text-slate-500">Surface :</span> {request.surface}
          </p>
          <p>
            <span className="text-slate-500">Urgence :</span> {request.isUrgent ? "Oui" : "Non"}
          </p>
          <p className="whitespace-pre-wrap sm:col-span-2">
            <span className="text-slate-500">Description :</span>{" "}
            {request.description || "Aucune précision"}
          </p>
        </section>
        <section className="space-y-3">
          <h2 className="font-bold text-white">Pièces jointes privées</h2>
          {attachments.map((attachment) => (
            <Link
              key={attachment.id}
              href={`/api/files/quote-attachments/${attachment.id}`}
              className="block rounded border border-slate-800 bg-slate-950 p-3 text-brand-terracotta hover:underline"
            >
              {attachment.originalName} · {Math.ceil(attachment.sizeBytes / 1024)} Ko
            </Link>
          ))}
          {attachments.length === 0 && <p className="text-slate-500">Aucune pièce jointe.</p>}
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
        endpoint={`/api/admin/devis/${request.id}/status`}
        currentStatus={request.status}
        initialNotes={request.internalNotes}
        initialAssigneeId={request.assignedToUserId}
        assigneeOptions={assignees}
        options={available.map((value) => ({ value, label: LABELS[value] }))}
      />
    </div>
  );
}
