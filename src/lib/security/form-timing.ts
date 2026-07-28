export const FORM_STARTED_AT_FIELD = "form_started_at";
export const MINIMUM_FORM_COMPLETION_MS = 800;
const MAXIMUM_FORM_AGE_MS = 24 * 60 * 60 * 1_000;

export function hasPlausibleFormTiming(
  value: unknown,
  now = Date.now()
): boolean {
  const startedAt =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^\d{13}$/.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(startedAt)) return false;
  const elapsed = now - startedAt;
  return (
    elapsed >= MINIMUM_FORM_COMPLETION_MS &&
    elapsed <= MAXIMUM_FORM_AGE_MS
  );
}
