import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { contactMessages } from "@/db/schema/contacts";
import { quoteAttachments, quoteRequests, quotes } from "@/db/schema/quotes";
import { invoices } from "@/db/schema/invoices";
import { projects } from "@/db/schema/projects";
import { requireApiUser } from "@/lib/security/guards";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";

export const dynamic = "force-dynamic";

const ROUTE = "/api/client/privacy/export";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(req, "documentDownload", `privacy:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const [account, contacts, requests, attachments, commercialQuotes, clientInvoices, clientProjects] =
    await Promise.all([
      db
        .select({
          id: users.id,
          email: users.email,
          phone: users.phone,
          role: users.role,
          emailVerifiedAt: users.emailVerifiedAt,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, auth.user.id))
        .limit(1),
      db
        .select({
          reference: contactMessages.reference,
          subject: contactMessages.subject,
          message: contactMessages.message,
          status: contactMessages.status,
          createdAt: contactMessages.createdAt,
        })
        .from(contactMessages)
        .where(eq(contactMessages.userId, auth.user.id)),
      db
        .select({
          id: quoteRequests.id,
          reference: quoteRequests.reference,
          status: quoteRequests.status,
          interventionType: quoteRequests.interventionType,
          roofType: quoteRequests.roofType,
          surface: quoteRequests.surface,
          isUrgent: quoteRequests.isUrgent,
          postalCode: quoteRequests.postalCode,
          city: quoteRequests.city,
          description: quoteRequests.description,
          createdAt: quoteRequests.createdAt,
        })
        .from(quoteRequests)
        .where(eq(quoteRequests.userId, auth.user.id)),
      db
        .select({
          originalName: quoteAttachments.originalName,
          mimeType: quoteAttachments.mimeType,
          sizeBytes: quoteAttachments.sizeBytes,
          checksum: quoteAttachments.checksum,
          createdAt: quoteAttachments.createdAt,
        })
        .from(quoteAttachments)
        .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
        .where(eq(quoteRequests.userId, auth.user.id)),
      db
        .select({
          number: quotes.number,
          status: quotes.status,
          amountHt: quotes.amountHt,
          vatAmount: quotes.vatAmount,
          amountTtc: quotes.amountTtc,
          validUntil: quotes.validUntil,
          signedAt: quotes.signedAt,
          createdAt: quotes.createdAt,
        })
        .from(quotes)
        .where(eq(quotes.userId, auth.user.id)),
      db
        .select({
          number: invoices.number,
          status: invoices.status,
          amountHt: invoices.amountHt,
          vatAmount: invoices.vatAmount,
          amountTtc: invoices.amountTtc,
          issuedAt: invoices.issuedAt,
          dueAt: invoices.dueAt,
          paidAt: invoices.paidAt,
        })
        .from(invoices)
        .where(eq(invoices.userId, auth.user.id)),
      db
        .select({
          address: projects.address,
          roofType: projects.roofType,
          status: projects.status,
          startDate: projects.startDate,
          endDate: projects.endDate,
          createdAt: projects.createdAt,
        })
        .from(projects)
        .where(eq(projects.userId, auth.user.id)),
    ]);

  return new NextResponse(
    JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: account[0] ?? null,
        contacts,
        quoteRequests: requests,
        attachments,
        quotes: commercialQuotes,
        invoices: clientInvoices,
        projects: clientProjects,
      },
      null,
      2
    ),
    {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Content-Disposition": 'attachment; filename="mes-donnees-zlobodan.json"',
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    }
  );
}
