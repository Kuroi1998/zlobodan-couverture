import { and, eq, isNull, ne } from "drizzle-orm";
import { db } from "@/db/client";
import { users } from "@/db/schema/users";
import { sessions } from "@/db/schema/sessions";
import { emailVerificationTokens } from "@/db/schema/tokens";
import {
  hashPassword,
  verifyPassword,
  validatePasswordPolicy,
  isPasswordPwned,
  consumeDummyVerification,
} from "@/lib/auth/password";
import { normalizeEmail } from "@/lib/validations/normalize";
import {
  generateToken,
  hashToken,
  setSessionCookie,
  clearSessionCookie,
  hashIpAddress,
} from "@/lib/auth/session";
import { verifyTotpToken } from "@/lib/auth/totp";
import { requireTurnstilePass } from "@/lib/auth/turnstile";
import { recordSecurityEvent } from "@/lib/security/security-events";
import {
  applyThrottleDelay,
  clearLoginFailures,
  getLoginGate,
  recordLoginFailure,
  THRESHOLDS,
} from "@/lib/security/login-throttle";
import { sendSecurityNotification } from "./notification-service";
import { logAuditEvent } from "./audit-service";
import { AuthError } from "./auth-errors";

/** Durées de session différenciées : un accès privilégié vit moins longtemps. */
const SESSION_MAX_AGE_SECONDS: Record<string, number> = {
  admin: 8 * 60 * 60,
  staff: 8 * 60 * 60,
  client: 7 * 24 * 60 * 60,
};

const PRIVILEGED_ROLES = new Set(["admin", "staff"]);

export interface RegisterInput {
  email: string;
  password: string;
  phone?: string;
  ipAddress?: string | null;
}

/**
 * Inscription.
 *
 * La réponse est volontairement identique que l'adresse soit déjà connue ou
 * non : c'est ce qui empêche d'énumérer la clientèle (audit M4). Le cas
 * « compte existant » est traité en interne et journalisé.
 */
export async function registerUser(input: RegisterInput): Promise<{ accepted: true }> {
  const normalizedEmail = normalizeEmail(input.email);

  const policy = validatePasswordPolicy(input.password);
  if (!policy.isValid) throw new AuthError("weak-password", 400);

  if (await isPasswordPwned(input.password)) {
    throw new AuthError("pwned-password", 400);
  }

  const existing = await db.query.users.findFirst({
    where: eq(users.email, normalizedEmail),
  });

  if (existing) {
    await recordSecurityEvent({
      kind: "VALIDATION_REJECTED",
      severity: "low",
      ipAddress: input.ipAddress ?? null,
      detail: { control: "register", outcome: "duplicate-email-suppressed" },
    });
    // Même forme de retour : rien ne distingue ce cas du succès.
    return { accepted: true };
  }

  const pwdHash = await hashPassword(input.password);

  const [newUser] = await db
    .insert(users)
    .values({
      email: normalizedEmail,
      passwordHash: pwdHash,
      phone: input.phone || null,
      role: "client",
    })
    .returning();

  const rawVerifyToken = generateToken();
  await db.insert(emailVerificationTokens).values({
    userId: newUser.id,
    tokenHash: hashToken(rawVerifyToken),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  await logAuditEvent({
    userId: newUser.id,
    action: "USER_REGISTER",
    targetTable: "users",
    targetId: newUser.id,
    ipAddress: input.ipAddress ?? undefined,
  });

  return { accepted: true };
}

export interface LoginInput {
  email: string;
  password: string;
  totpCode?: string;
  captchaToken?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/** Un appareil est « connu » si une session antérieure partage IP et agent. */
async function isKnownDevice(
  userId: string,
  ipHash: string | null,
  userAgent: string | null
): Promise<boolean> {
  if (!ipHash && !userAgent) return true;

  const previous = await db
    .select({ ipHash: sessions.ipHash, userAgent: sessions.userAgent })
    .from(sessions)
    .where(eq(sessions.userId, userId))
    .limit(50);

  return previous.some((s) => s.ipHash === ipHash && s.userAgent === userAgent);
}

/**
 * Journalise et temporise un échec, puis *retourne* l'erreur à lever.
 *
 * Elle retourne au lieu de lever pour que les appelants écrivent
 * `throw await failLogin(...)` : TypeScript sait alors que le flot s'arrête
 * là, et peut affiner le type de `user` sur les lignes suivantes.
 */
async function failLogin(
  email: string,
  ip: string | null,
  userId: string | null,
  reason: string
): Promise<AuthError> {
  const failures = await recordLoginFailure(email, ip);

  await recordSecurityEvent({
    kind: "LOGIN_FAILED",
    severity: failures >= THRESHOLDS.lock ? "high" : "medium",
    userId,
    ipAddress: ip,
    detail: { reason, failures },
  });

  if (failures === THRESHOLDS.lock && userId) {
    const account = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (account) {
      await sendSecurityNotification({
        kind: "account-locked",
        to: account.email,
        context: { Tentatives: String(failures) },
      });
    }
  }

  // Temporisation appliquée après la vérification, jamais avant : attendre en
  // amont révélerait par le temps de réponse que le compte est surveillé.
  const gate = await getLoginGate(email, ip);
  await applyThrottleDelay(gate.delayMs);

  return new AuthError("invalid-credentials");
}

export async function loginUser(input: LoginInput): Promise<{ user: typeof users.$inferSelect }> {
  const normalizedEmail = normalizeEmail(input.email);
  const ip = input.ipAddress ?? null;

  const gate = await getLoginGate(normalizedEmail, ip);
  if (gate.locked) {
    await recordSecurityEvent({
      kind: "ACCOUNT_THROTTLED",
      severity: "high",
      ipAddress: ip,
      detail: { failures: gate.failures, stage: "locked" },
    });
    throw new AuthError("locked");
  }

  // Le contrôle anti-automate s'applique dès le palier, indépendamment de
  // l'existence du compte : le conditionner à l'état du compte en ferait un
  // oracle d'énumération.
  if (gate.requiresChallenge) {
    if (!input.captchaToken) throw new AuthError("challenge-required");
    if (!(await requireTurnstilePass(input.captchaToken, ip))) {
      throw new AuthError("challenge-failed");
    }
  }

  const user = await db.query.users.findFirst({
    where: and(eq(users.email, normalizedEmail), isNull(users.deletedAt)),
  });

  if (!user) {
    // Égalisation du temps de réponse. Sans cette comparaison factice, le code
    // reviendrait immédiatement, et la différence de durée avec un compte
    // existant suffirait à énumérer la clientèle au chronomètre.
    await consumeDummyVerification(input.password);
    throw await failLogin(normalizedEmail, ip, null, "unknown-account");
  }

  if (!(await verifyPassword(input.password, user.passwordHash))) {
    throw await failLogin(normalizedEmail, ip, user.id, "bad-password");
  }

  // --- Deuxième facteur -----------------------------------------------------
  //
  // La version précédente ouvrait la session quand le rôle exigeait le TOTP
  // mais que `totpSecret` était absent : la branche censée imposer l'enrôlement
  // était un commentaire vide (audit H5). Un administrateur non enrôlé se
  // connectait donc avec le seul mot de passe.
  const requiresTotp = PRIVILEGED_ROLES.has(user.role) || user.totpEnabled === 1;

  if (requiresTotp) {
    if (!user.totpSecret) {
      await recordSecurityEvent({
        kind: "TOTP_REQUIRED_NOT_ENROLLED",
        severity: "high",
        userId: user.id,
        ipAddress: ip,
        detail: { role: user.role },
      });
      // Refus complet : aucune session n'est émise. L'enrôlement passe par un
      // parcours dédié, hors du chemin de connexion.
      throw new AuthError("totp-enrollment-required", 403);
    }

    if (!input.totpCode) throw new AuthError("totp-required");

    if (!verifyTotpToken(user.totpSecret, input.totpCode)) {
      await recordSecurityEvent({
        kind: "TOTP_FAILED",
        severity: "high",
        userId: user.id,
        ipAddress: ip,
      });
      throw await failLogin(normalizedEmail, ip, user.id, "bad-totp");
    }
  }

  // --- Succès ---------------------------------------------------------------
  await clearLoginFailures(normalizedEmail, ip);

  const ipHash = ip ? hashIpAddress(ip) : null;
  const userAgent = input.userAgent ?? null;
  const knownDevice = await isKnownDevice(user.id, ipHash, userAgent);

  await db
    .update(users)
    .set({ failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(users.id, user.id));

  const maxAgeSeconds = SESSION_MAX_AGE_SECONDS[user.role] ?? SESSION_MAX_AGE_SECONDS.client;
  const rawSessionToken = generateToken();
  const now = new Date();

  await db.insert(sessions).values({
    userId: user.id,
    tokenHash: hashToken(rawSessionToken),
    userAgent,
    ipHash,
    lastSeenAt: now,
    expiresAt: new Date(now.getTime() + maxAgeSeconds * 1000),
  });

  setSessionCookie(rawSessionToken, maxAgeSeconds);

  await recordSecurityEvent({
    kind: knownDevice ? "LOGIN_SUCCESS" : "LOGIN_NEW_DEVICE",
    severity: knownDevice ? "info" : "medium",
    userId: user.id,
    ipAddress: ip,
    detail: { role: user.role },
  });

  if (!knownDevice) {
    await sendSecurityNotification({
      kind: "new-device-login",
      to: user.email,
      context: { Date: now.toISOString(), Navigateur: userAgent ?? "inconnu" },
    });
  }

  return { user };
}

export async function logoutUser(sessionToken?: string): Promise<void> {
  if (sessionToken) {
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.tokenHash, hashToken(sessionToken)));
  }
  clearSessionCookie();
}

/** Révocation globale : changement de mot de passe, réponse à incident. */
export async function revokeOtherSessions(userId: string, keepSessionId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), ne(sessions.id, keepSessionId)));
}
