import { logInfo, logWarn } from "./logger";

/**
 * P2-11: PRD §51-style funnel events.
 * Always logs `analytics.<event>`; optionally forwards to PostHog if ANALYTICS_WRITE_KEY / POSTHOG_KEY is set.
 */
export function track(event: string, props: Record<string, unknown> = {}) {
  logInfo(`analytics.${event}`, props);
  const key = process.env.ANALYTICS_WRITE_KEY || process.env.POSTHOG_KEY;
  if (!key) return;
  const distinctId = String(props.userId || props.distinctId || "anonymous");
  void fetch("https://us.i.posthog.com/i/v0/e/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: { ...props, source: "dink-api" },
    }),
  }).catch((err) => {
    logWarn("analytics.forward_fail", {
      event,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
