import crypto from "node:crypto";

const MINIMUM_NEUTRAL_RESPONSE_MS = 300;
const JITTER_MS = 80;

export async function settleNeutralResponse(startedAt: number): Promise<void> {
  const target =
    MINIMUM_NEUTRAL_RESPONSE_MS + crypto.randomInt(0, JITTER_MS + 1);
  const remaining = target - (Date.now() - startedAt);
  if (remaining <= 0) return;
  await new Promise((resolve) => setTimeout(resolve, remaining));
}

export const NEUTRAL_RESPONSE_TIMING = {
  minimumMs: MINIMUM_NEUTRAL_RESPONSE_MS,
  jitterMs: JITTER_MS,
} as const;
