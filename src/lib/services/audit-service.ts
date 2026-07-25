import { db } from "@/db/client";
import { auditLog } from "@/db/schema/audit";
import { hashIpAddress } from "@/lib/auth/session";

export interface LogAuditEventParams {
  userId?: string | null;
  action: string;
  targetTable: string;
  targetId?: string | null;
  diff?: Record<string, any> | null;
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
  } catch (error) {
    console.error("Failed to write to append-only audit log:", error);
  }
}
