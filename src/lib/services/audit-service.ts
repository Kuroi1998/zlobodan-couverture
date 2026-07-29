import { db } from "@/db/client";
import { auditLog } from "@/db/schema/audit";
import { hashIpAddress } from "@/lib/auth/session";
import { recordSecurityEvent } from "@/lib/security/security-events";

export interface LogAuditEventParams {
  userId?: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  diff?: Record<string, unknown> | null;
  ipAddress?: string;
}

export async function logAuditEvent({
  userId,
  action,
  targetTable,
  targetId,
  diff,
  ipAddress,
}: LogAuditEventParams): Promise<void> {
  try {
    const ipHash = ipAddress ? hashIpAddress(ipAddress) : null;
    const diffJson = diff ? JSON.stringify(diff) : null;

    await db.insert(auditLog).values({
      userId: userId || null,
      action,
      targetTable,
      targetId: targetId || null,
      diff: diffJson,
      ipHash,
    });
  } catch {
    await recordSecurityEvent({
      kind: "AUDIT_WRITE_FAILURE",
      severity: "critical",
      userId,
      targetTable,
      targetId,
      detail: {
        failedAction: action,
        reason: "persistence-failed",
      },
    });
  }
}
