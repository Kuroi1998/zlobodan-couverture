import "server-only";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { securityEvents } from "@/db/schema/security-events";

export async function listOwnSecurityActivity(userId: string, limit = 25) {
  return db
    .select({
      id: securityEvents.id,
      eventType: securityEvents.eventType,
      severity: securityEvents.severity,
      userAgent: securityEvents.userAgent,
      createdAt: securityEvents.createdAt,
    })
    .from(securityEvents)
    .where(eq(securityEvents.userId, userId))
    .orderBy(desc(securityEvents.createdAt))
    .limit(Math.min(Math.max(limit, 1), 50));
}
