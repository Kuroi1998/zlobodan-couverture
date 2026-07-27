import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/security/guards";
import { readJsonBody } from "@/lib/security/body";
import { enforceRateLimit } from "@/lib/security/rate-limit-guard";
import { getTrustedIp } from "@/lib/security/request-context";
import { AdminAccountStatusSchema } from "@/lib/validations/auth-schemas";
import { setAccountStatus } from "@/lib/services/auth/admin-account-service";
import { authValidationResponse } from "@/lib/api/auth-responses";

const ROUTE = "/api/admin/accounts/[id]/status";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireApiRole(ROUTE, ["admin"]);
  if (!auth.ok) return auth.response;
  const limit = await enforceRateLimit(req, "accountUpdate", `admin:${auth.user.id}`);
  if (!limit.allowed) return limit.response;
  const body = await readJsonBody(req, 8 * 1024);
  if (!body.ok) return body.response;
  const parsed = AdminAccountStatusSchema.safeParse(body.value);
  if (!parsed.success) return authValidationResponse(parsed.error.issues[0]?.message);
  const { id } = await context.params;
  const changed = await setAccountStatus({
    actorUserId: auth.user.id,
    targetPublicId: id,
    ...parsed.data,
    ipAddress: getTrustedIp(req),
  });
  if (!changed) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Compte introuvable." } },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, message: "Statut du compte modifié." });
}
