import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { sessions } from "@/db/schema/sessions";
import { hashToken } from "@/lib/auth/session";
import { recordSecurityEvent } from "@/lib/security/security-events";

export {
  registerUser,
  resendVerificationEmail,
  verifyEmailToken,
} from "./auth/registration-service";
export { beginLogin, completeTwoFactorLogin } from "./auth/login-service";
export {
  requestPasswordReset,
  resetPassword,
  changePassword,
} from "./auth/password-service";
export {
  requestEmailChange,
  confirmEmailChange,
} from "./auth/email-change-service";
export {
  setupTwoFactor,
  activateTwoFactor,
  removeTwoFactor,
  replaceRecoveryCodes,
} from "./auth/two-factor-account-service";
export {
  listActiveSessions,
  revokeOwnedSession,
  revokeOtherSessions,
  revokeAllSessions,
} from "./auth/session-service";

export async function logoutUser(sessionToken?: string): Promise<void> {
  if (!sessionToken) return;
  const updated = await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(eq(sessions.tokenHash, hashToken(sessionToken)))
    .returning({ userId: sessions.userId, id: sessions.id });
  const session = updated[0];
  if (session) {
    await recordSecurityEvent({
      kind: "LOGOUT",
      severity: "info",
      userId: session.userId,
      sessionId: session.id,
    });
  }
}
