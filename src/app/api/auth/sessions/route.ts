import { NextRequest, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/security/guards";
import { resolveSession } from "@/lib/security/session-guard";
import { listActiveSessions } from "@/lib/services/auth-service";

export const dynamic = "force-dynamic";
const ROUTE = "/api/auth/sessions";

export async function GET(_req: NextRequest) {
  const auth = await requireApiUser(ROUTE);
  if (!auth.ok) return auth.response;
  const { sessionId } = await resolveSession();
  if (!sessionId) {
    return NextResponse.json(
      { success: false, error: { code: "SESSION_EXPIRED", message: "Session expirée." } },
      { status: 401 }
    );
  }
  const items = await listActiveSessions(auth.user.id, sessionId);
  return NextResponse.json({ success: true, data: { sessions: items } });
}
