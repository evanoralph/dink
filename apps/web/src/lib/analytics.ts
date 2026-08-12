import { logInfo, logWarn } from "./logger";

/** P2-11: client/server funnel events (PRD §51 subset). */
export function track(event: string, props: Record<string, unknown> = {}) {
  logInfo(`analytics.${event}`, props);
  const key =
    (typeof process !== "undefined" &&
      (process.env.NEXT_PUBLIC_POSTHOG_KEY || process.env.ANALYTICS_WRITE_KEY)) ||
    "";
  if (!key || typeof fetch === "undefined") return;
  const distinctId = String(props.userId || props.distinctId || "anonymous");
  void fetch("https://us.i.posthog.com/i/v0/e/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: key,
      event,
      distinct_id: distinctId,
      properties: { ...props, source: "dink-web" },
    }),
  }).catch((err) => {
    logWarn("analytics.forward_fail", {
      event,
      message: err instanceof Error ? err.message : String(err),
    });
  });
}
