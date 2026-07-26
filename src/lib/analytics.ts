type AnalyticsParameters = Readonly<Record<string, string | number | boolean>>;

type AnalyticsFunction = (
  command: "event",
  eventName: string,
  parameters: AnalyticsParameters
) => void;

export function trackEvent(
  eventName: string,
  parameters: AnalyticsParameters
): void {
  if (typeof window === "undefined") return;

  const analytics: unknown = Reflect.get(window, "gtag");
  if (typeof analytics !== "function") return;

  (analytics as AnalyticsFunction)("event", eventName, parameters);
}
