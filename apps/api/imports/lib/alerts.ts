/**
 * P1-30: optional Slack/Discord-compatible webhook for ops alerts.
 * Set ALERT_WEBHOOK_URL (Incoming Webhook). No-ops when unset.
 */
import { logDebug, logInfo, logWarn } from "./logger";

export async function sendOpsAlert(
  title: string,
  fields: Record<string, unknown> = {},
): Promise<void> {
  const url = process.env.ALERT_WEBHOOK_URL;
  if (!url) {
    logDebug("alert.skip", { title, reason: "no_ALERT_WEBHOOK_URL" });
    return;
  }

  const text = `[Dink] ${title}\n${JSON.stringify(fields)}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, content: text }),
    });
    if (!res.ok) {
      logWarn("alert.send_fail", { title, status: res.status });
      return;
    }
    logInfo("alert.sent", { title });
  } catch (error) {
    logWarn("alert.send_error", {
      title,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}
