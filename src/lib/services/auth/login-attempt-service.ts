import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import {
  applyThrottleDelay,
  getLoginGate,
  recordLoginFailure,
  THRESHOLDS,
} from "@/lib/security/login-throttle";
import { recordSecurityEvent } from "@/lib/security/security-events";
import { AuthError } from "../auth-errors";

export const ACCOUNT_LOCK_MS = 15 * 60 * 1000;

export async function failAuthentication(
  email: string,
  ipAddress: string | null,
  userId: string | null,
  reason: string
): Promise<AuthError> {
  const failures = await recordLoginFailure(email, ipAddress);
  if (userId) {
    await db
      .update(users)
      .set({
        failedLoginAttempts: failures,
        lockedUntil:
          failures >= THRESHOLDS.lock
            ? new Date(Date.now() + ACCOUNT_LOCK_MS)
            : null,
        status: failures >= THRESHOLDS.lock ? "locked" : undefined,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }

  await recordSecurityEvent({
    kind: failures >= THRESHOLDS.lock ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
    severity: failures >= THRESHOLDS.lock ? "high" : "medium",
    userId,
    ipAddress,
    detail: { reason, failures },
  });
  const gate = await getLoginGate(email, ipAddress);
  await applyThrottleDelay(gate.delayMs);
  return new AuthError("INVALID_CREDENTIALS");
}
