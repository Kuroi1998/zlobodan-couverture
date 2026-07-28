import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteAttachments, quoteRequests, quoteStatusHistory } from "@/db/schema/quotes";
import WorkflowEditor from "@/components/admin/WorkflowEditor";
import InternalNotesPanel from "@/components/admin/InternalNotesPanel";
import { allowedQuoteRequestTransitions } from "@/domain/request-workflow";
import {
  interventionLabel,
  quoteRequestLabel,
  roofLabel,
  surfaceLabel,
} from "@/domain/request-labels";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { requirePageRole } from "@/lib/security/guards";
import { listAssignableOperators } from "@/lib/db/repositories/quote-request-repository";
import { listInternalNotes } from "@/lib/services/internal-note-service";
import DocumentsPanel from "@/components/admin/DocumentsPanel";
import { listDocumentsForRequest, listVersions } from "@/lib/documents/repository";

export const dynamic = "force-dynamic";

const ROUTE = "/admin/demandes/[id]";

export default async function AdminQuoteRequestDetailPage({
  params,
}: Readonly<{ params: Promise<{ id: string }> }>) {
  const operator = await requirePageRole(["staff", "admin"], ROUTE);

  const parsed = parseUuidParam((await params).id);
  if (!parsed.ok || !parsed.value) notFound();

  const rows = await db
    .select()
    .from(quoteRequests)
    .where(eq(quoteRequests.id, parsed.value))
    .limit(1);
  const request = rows[0];
  if (!request) notFound();

  const [history, attachments, assignees, notes] = await Promise.all([
    db
      .select()
      .from(quoteStatusHistory)
      .where(eq(quoteStatusHistory.quoteRequestId, request.id))
      .orderBy(asc(quoteStatusHistory.createdAt))
      .limit(100),
    db
      .select()
      .from(quoteAttachments)
      .where(eq(quoteAttachments.quoteRequestId, request.id))
      .orderBy(asc(quoteAttachments.createdAt))
      .limit(50),
    listAssignableOperators(),
    listInternalNotes({
      actor: operator,
      entityType: "quote_request",
      entityId: request.id,
    }),
  ]);

  const available = [request.status, ...allowedQuoteRequestTransitions(request.status)];

  // Historique documentaire. Chaque document est accompagné de toutes ses
  // versions, y compris celles en échec : masquer un échec de génération le
  // rendrait indétectable depuis l'interface.
  const documentRows = await listDocumentsForRequest(request.id);
  const documentPanels = await Promise.all(
    documentRows.map(async (document) => ({
      publicId: document.publicId,
      reference: document.reference,
      title: document.title,
      status: document.status,
      versions: (await listVersions(document.id)).map((version) => ({
        versionNumber: version.versionNumber,
        state: version.state,
        createdAt: version.createdAt.toLocaleString("fr-BE"),
        checksum: version.checksumValue,
        isCurrent: version.id === document.currentVersionId,
      })),
    }))
  );

  // Moindre privilège, reflété dans l'interface : un opérateur ne génère que
  // sur les dossiers qui lui sont affectés. La route applique la même règle —
  // masquer le bouton ne protège rien à lui seul.
  const canGenerate =
    operator.role === "admin" || request.assignedToUserId === operator.id;

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

        {/* Les coordonnées ci-dessus sont la déclaration du client : elles ne
            sont pas éditables. Une correction se consigne en note interne,
            jamais par réécriture de ce que le demandeur a écrit. */}
        <section className="grid gap-3 rounded border border-slate-800 bg-slate-950 p-5 sm:grid-cols-2">
          <p>
            <span className="text-slate-500">Intervention :</span>{" "}
            {interventionLabel(request.interventionType)}
          </p>
          <p>
            <span className="text-slate-500">Toiture :</span> {roofLabel(request.roofType)}
          </p>
          <p>
            <span className="text-slate-500">Surface :</span> {surfaceLabel(request.surface)}
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
                {item.previousStatus ? quoteRequestLabel(item.previousStatus) : "Création"} →{" "}
                {quoteRequestLabel(item.newStatus)}
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
          endpoint={`/api/admin/demandes/${request.id}/status`}
          currentStatus={request.status}
          initialAssigneeId={request.assignedToUserId}
          assigneeOptions={assignees}
          options={available.map((value) => ({
            value,
            label: quoteRequestLabel(value),
          }))}
        />
        <DocumentsPanel
          endpoint={`/api/admin/demandes/${request.id}/documents`}
          documents={documentPanels}
          canGenerate={canGenerate}
        />
        <InternalNotesPanel
          entityType="quote_request"
          entityId={request.id}
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
