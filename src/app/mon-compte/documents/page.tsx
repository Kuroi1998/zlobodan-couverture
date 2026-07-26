import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Download, FolderOpen } from "lucide-react";
import { db } from "@/db/client";
import { quoteAttachments, quoteRequests } from "@/db/schema/quotes";
import { requirePageAuth } from "@/lib/security/guards";

export default async function ClientDocumentsPage() {
  const user = await requirePageAuth("/mon-compte/documents");
  const attachments = await db
    .select({
      id: quoteAttachments.id,
      originalName: quoteAttachments.originalName,
      mimeType: quoteAttachments.mimeType,
      sizeBytes: quoteAttachments.sizeBytes,
      createdAt: quoteAttachments.createdAt,
      requestReference: quoteRequests.reference,
    })
    .from(quoteAttachments)
    .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
    .where(eq(quoteRequests.userId, user.id))
    .orderBy(desc(quoteAttachments.createdAt))
    .limit(100);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mes documents</h1>
        <p className="text-sm text-slate-400">
          Pièces jointes privées associées à vos propres demandes.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {attachments.map((attachment) => (
          <article
            key={attachment.id}
            className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900 p-5"
          >
            <div className="min-w-0">
              <p className="truncate font-bold text-white">{attachment.originalName}</p>
              <p className="text-xs text-slate-500">
                {attachment.requestReference} · {Math.ceil(attachment.sizeBytes / 1024)} Ko ·{" "}
                {attachment.createdAt.toLocaleDateString("fr-BE")}
              </p>
            </div>
            <Link
              href={`/api/files/quote-attachments/${attachment.id}`}
              aria-label={`Télécharger ${attachment.originalName}`}
              className="rounded-xl bg-slate-800 p-3 text-brand-terracotta"
            >
              <Download className="h-4 w-4" />
            </Link>
          </article>
        ))}
        {attachments.length === 0 && (
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center text-slate-400 sm:col-span-2">
            <FolderOpen className="mx-auto mb-3 h-7 w-7" />
            Aucun document n'est rattaché à votre compte.
          </div>
        )}
      </div>
    </div>
  );
}
