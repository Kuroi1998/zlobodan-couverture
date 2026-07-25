import { db } from "@/db/client";
import { auditLog } from "@/db/schema/audit";
import { hashIpAddress } from "@/lib/auth/session";

/**
 * Journal de sécurité centralisé.
 *
 * Deux sorties distinctes et volontairement indépendantes :
 *  - une ligne JSON sur stdout, destinée à la collecte externe (§6 du cahier
 *    des charges). Elle ne contient jamais de donnée personnelle en clair.
 *  - une écriture dans `audit_log` pour les événements de gravité haute.
 *
 * L'échec d'écriture en base ne fait pas disparaître l'événement : il produit
 * au contraire une ligne d'alerte dédiée. Avant ce module, `auditService`
 * avalait ses erreurs, ce qui permettait à un attaquant d'effacer sa trace en
 * faisant simplement échouer l'insertion (audit M9).
 */

export type SecuritySeverity = "info" | "low" | "medium" | "high" | "critical";

export type SecurityEventKind =
  | "ACCESS_DENIED_UNAUTHENTICATED"
  | "ACCESS_DENIED_ROLE"
  | "ACCESS_DENIED_OWNERSHIP"
  | "SESSION_TOKEN_REUSE"
  | "SESSION_RESOLUTION_FAILURE"
  | "LOGIN_FAILED"
  | "LOGIN_SUCCESS"
  | "LOGIN_NEW_DEVICE"
  | "ACCOUNT_THROTTLED"
  | "ACCOUNT_LOCKED"
  | "TOTP_REQUIRED_NOT_ENROLLED"
  | "TOTP_FAILED"
  | "RATE_LIMIT_EXCEEDED"
  | "CSRF_REJECTED"
  | "CSP_VIOLATION"
  | "VALIDATION_REJECTED"
  | "HONEYPOT_TRIGGERED"
  | "UPLOAD_REJECTED"
  | "QUOTE_REQUEST_CREATED"
  | "AUDIT_WRITE_FAILURE";

export interface SecurityEventInput {
  kind: SecurityEventKind;
  severity: SecuritySeverity;
  userId?: string | null;
  /** IP brute : hachée avant toute sortie, jamais journalisée en clair. */
  ipAddress?: string | null;
  route?: string | null;
  targetTable?: string | null;
  targetId?: string | null;
  detail?: Record<string, unknown> | null;
}

const PERSISTED_SEVERITIES: ReadonlySet<SecuritySeverity> = new Set<SecuritySeverity>([
  "high",
  "critical",
]);

/** Plafond de taille du champ `diff`, pour qu'une charge volumineuse ne fasse pas échouer l'insertion. */
const MAX_DETAIL_CHARS = 4000;

const SENSITIVE_KEYS = [
  "password",
  "newpassword",
  "passwordhash",
  "token",
  "totp",
  "totpcode",
  "totpsecret",
  "secret",
  "captchatoken",
  "authorization",
  "cookie",
];

/**
 * Purge récursive des valeurs sensibles avant toute sortie (journal ou
 * supervision externe). Bornée en profondeur : une structure profonde ou
 * cyclique ne doit pas coûter une pile d'appels.
 */
export function redact(value: unknown, depth = 0): unknown {
  if (depth > 4) return "[depth-limit]";
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.slice(0, 20).map((item) => redact(item, depth + 1));
  }

  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      if (key === "__proto__" || key === "constructor" || key === "prototype") continue;
      const normalized = key.toLowerCase().replace(/[_-]/g, "");
      out[key] = SENSITIVE_KEYS.some((s) => normalized.includes(s))
        ? "[redacted]"
        : redact(raw, depth + 1);
    }
    return out;
  }

  if (typeof value === "string" && value.length > 500) {
    return `${value.slice(0, 500)}…[truncated]`;
  }

  return value;
}

function truncateJson(payload: unknown): string | null {
  if (payload === null || payload === undefined) return null;
  const serialized = JSON.stringify(payload);
  if (!serialized) return null;
  return serialized.length > MAX_DETAIL_CHARS
    ? `${serialized.slice(0, MAX_DETAIL_CHARS)}…[truncated]`
    : serialized;
}

function emitStructuredLine(payload: Record<string, unknown>): void {
  // Une ligne JSON par événement : format attendu par un collecteur externe.
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

export async function recordSecurityEvent(input: SecurityEventInput): Promise<void> {
  const ipHash = input.ipAddress ? hashIpAddress(input.ipAddress) : null;
  const detail = input.detail ? (redact(input.detail) as Record<string, unknown>) : null;

  const line = {
    channel: "security",
    ts: new Date().toISOString(),
    kind: input.kind,
    severity: input.severity,
    userId: input.userId ?? null,
    ipHash,
    route: input.route ?? null,
    targetTable: input.targetTable ?? null,
    targetId: input.targetId ?? null,
    detail,
  };

  emitStructuredLine(line);

  if (!PERSISTED_SEVERITIES.has(input.severity)) return;

  try {
    await db.insert(auditLog).values({
      userId: input.userId ?? null,
      action: input.kind,
      targetTable: input.targetTable ?? "security",
      targetId: input.targetId ?? null,
      diff: truncateJson(detail),
      ipHash,
    });
  } catch (error) {
    // Une trace d'audit qui ne s'écrit pas est elle-même un incident : on la
    // signale bruyamment au lieu de l'avaler.
    emitStructuredLine({
      channel: "security",
      ts: new Date().toISOString(),
      kind: "AUDIT_WRITE_FAILURE" satisfies SecurityEventKind,
      severity: "critical" satisfies SecuritySeverity,
      alert: true,
      droppedEventKind: input.kind,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
}
