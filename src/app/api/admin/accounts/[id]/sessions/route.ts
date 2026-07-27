import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/security/guards";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { revokeAccountSessions } from "@/lib/services/auth/admin-account-service";

const ROUTE = "/api/admin/accounts/[id]/sessions";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(ROUTE, ["admin"]);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(req, "accountUpdate", `admin:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const { id } = await context.params;
  const revoked = await revokeAccountSessions({
    actorUserId: auth.user.id,
    targetPublicId: id,
    ipAddress: getTrustedIp(req),
  });
  if (!revoked) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Compte introuvable." } },
      { status: 404 }
    );
  }
  return new NextResponse(null, { status: 204 });
}
