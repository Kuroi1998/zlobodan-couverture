import crypto from "node:crypto";
import { hashToken } from "./session";

const RECOVERY_CODE_COUNT = 10;
const RECOVERY_CODE_BYTES = 8;

function formatRecoveryCode(value: string): string {
  const normalized = value.toUpperCase();
  return `${normalized.slice(0, 4)}-${normalized.slice(4, 8)}-${normalized.slice(8, 12)}`;
}

export function normalizeRecoveryCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function hashRecoveryCode(value: string): string {
  return hashToken(normalizeRecoveryCode(value));
}

export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    formatRecoveryCode(crypto.randomBytes(RECOVERY_CODE_BYTES).toString("hex"))
  );
}

export const RECOVERY_CODE_POLICY = {
  count: RECOVERY_CODE_COUNT,
  bytes: RECOVERY_CODE_BYTES,
} as const;
