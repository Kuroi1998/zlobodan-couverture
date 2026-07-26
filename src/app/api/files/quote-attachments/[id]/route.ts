import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { quoteAttachments, quoteRequests } from "@/db/schema/quotes";
import { authorizeResource, denyJson, requireApiUser } from "@/lib/security/guards";
import { parseUuidParam } from "@/lib/validations/identifiers";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { readPrivateObject } from "@/lib/storage/private-object-store";

export const dynamic = "force-dynamic";

const ROUTE = "/api/files/quote-attachments/[id]";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const parsed = parseUuidParam((await params).id);
  if (!parsed.ok || !parsed.value) return denyJson(404);

  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(req, "documentDownload", `user:${auth.user.id}`);
  if (!limit.allowed) return limit.response;

  const rows = await db
    .select({
      id: quoteAttachments.id,
      storageKey: quoteAttachments.storageKey,
      originalName: quoteAttachments.originalName,
      mimeType: quoteAttachments.mimeType,
      ownerId: quoteRequests.userId,
    })
    .from(quoteAttachments)
    .innerJoin(quoteRequests, eq(quoteAttachments.quoteRequestId, quoteRequests.id))
    .where(eq(quoteAttachments.id, parsed.value))
    .limit(1);
  const attachment = rows[0];
  if (!attachment) return denyJson(404);

  const denial = await authorizeResource(
    auth.user,
    "download",
    "document",
    { ownerId: attachment.ownerId },
    ROUTE
  );
  if (denial) return denial;

  try {
    const object = await readPrivateObject(attachment.storageKey);
    const encodedName = encodeURIComponent(attachment.originalName);
    return new NextResponse(new Uint8Array(object.bytes), {
      headers: {
        "Content-Type": attachment.mimeType,
        "Content-Length": String(object.bytes.length),
        "Content-Disposition": `attachment; filename="piece-jointe"; filename*=UTF-8''${encodedName}`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Fichier temporairement indisponible." },
      { status: 503 }
    );
  }
}
