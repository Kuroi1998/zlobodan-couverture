import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, isDistributedRateLimitConfigured } from "./rate-limiter";
import { rateLimitIdentity } from "./request-context";
import { recordSecurityEvent } from "./security-events";

/**
 * Politiques de débit par route.
 *
 * Seuils différenciés : très stricts sur ce qui coûte cher ou se force
 * (authentification, envoi de devis, upload), permissifs sur la navigation.
 * Un seuil unique pour tout le site serait soit trop laxiste sur le login,
 * soit insupportable en navigation.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

export interface RateLimitPolicy {
  windowMs: number;
  maxRequests: number;
}

export const POLICIES = {
  login: { windowMs: 15 * MINUTE, maxRequests: 10 },
  register: { windowMs: HOUR, maxRequests: 5 },
  passwordReset: { windowMs: HOUR, maxRequests: 5 },
  contactMessage: { windowMs: HOUR, maxRequests: 5 },
  contactMessagePerEmail: { windowMs: 24 * HOUR, maxRequests: 8 },
  quoteRequest: { windowMs: HOUR, maxRequests: 5 },
  /** Amplification email : plafond par destinataire, pas seulement par IP. */
  quoteRequestPerEmail: { windowMs: 24 * HOUR, maxRequests: 5 },
  upload: { windowMs: HOUR, maxRequests: 20 },
  documentDownload: { windowMs: MINUTE, maxRequests: 60 },
  quoteDecision: { windowMs: HOUR, maxRequests: 20 },
  browse: { windowMs: MINUTE, maxRequests: 120 },
} as const satisfies Record<string, RateLimitPolicy>;

export type PolicyName = keyof typeof POLICIES;

/**
 * Union discriminée : un refus porte toujours sa réponse, ce qui rend
 * impossible d'oublier de la retourner ou de la retourner à tort.
 */
export type RateLimitVerdict =
  | { allowed: true }
  | { allowed: false; response: NextResponse };

function tooManyRequests(retryAfterSeconds: number): NextResponse {
  const response = NextResponse.json(
    {
      success: false,
      error: "Trop de requêtes. Merci de patienter avant de réessayer.",
      retryAfter: retryAfterSeconds,
    },
    { status: 429 }
  );
  response.headers.set("Retry-After", String(retryAfterSeconds));
  return response;
}

/**
 * Applique une politique et renvoie une 429 prête à retourner si le quota est
 * dépassé. `scope` permet de compter séparément par IP et par compte sur la
 * même route.
 */
export async function enforceRateLimit(
  req: NextRequest,
  policyName: PolicyName,
  scope?: string
): Promise<RateLimitVerdict> {
  const policy = POLICIES[policyName];
  const identity = scope ?? rateLimitIdentity(req);
  const key = `${policyName}:${identity}`;

  const result = await consumeRateLimit({
    key,
    windowMs: policy.windowMs,
    maxRequests: policy.maxRequests,
  });

  if (!result.distributed && isDistributedRateLimitConfigured()) {
    // Redis est configuré mais n'a pas répondu : le quota vient de retomber
    // sur un compteur local, ce qui n'est plus une garantie multi-instances.
    await recordSecurityEvent({
      kind: "RATE_LIMIT_EXCEEDED",
      severity: "high",
      route: req.nextUrl.pathname,
      detail: { degraded: true, policy: policyName },
    });
  }

  if (result.allowed) return { allowed: true };

  await recordSecurityEvent({
    kind: "RATE_LIMIT_EXCEEDED",
    severity: "medium",
    route: req.nextUrl.pathname,
    ipAddress: scope ? null : rateLimitIdentity(req),
    detail: { policy: policyName, distributed: result.distributed },
  });

  return { allowed: false, response: tooManyRequests(result.retryAfterSeconds) };
}
