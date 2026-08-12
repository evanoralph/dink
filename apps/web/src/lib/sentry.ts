/**
 * P1-28: optional browser/server Sentry reporter for Next.js.
 * Uses NEXT_PUBLIC_SENTRY_DSN (browser) or SENTRY_DSN (server).
 */
import { logDebug, logWarn } from "./logger";

type SentryParsed = {
  publicKey: string;
  host: string;
  projectId: string;
};

let parsed: SentryParsed | null | undefined;

function parseDsn(dsn: string): SentryParsed | null {
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, "").split("/")[0];
    if (!publicKey || !projectId || !u.host) return null;
    return { publicKey, host: u.host, projectId };
  } catch {
    return null;
  }
}

function getConfig(): SentryParsed | null {
  if (parsed !== undefined) return parsed;
  const dsn =
    (typeof process !== "undefined" && (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN)) ||
    "";
  if (!dsn) {
    parsed = null;
    logDebug("sentry.disabled", { reason: "no_dsn" });
    return null;
  }
  parsed = parseDsn(dsn);
  if (!parsed) logWarn("sentry.bad_dsn", {});
  return parsed;
}

export async function captureException(
  error: unknown,
  context: Record<string, unknown> = {},
): Promise<void> {
  const cfg = getConfig();
  if (!cfg) return;

  const err =
    error instanceof Error
      ? error
      : new Error(typeof error === "string" ? error : "unknown_error");

  const eventId = Array.from({ length: 16 }, () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0"),
  ).join("");

  const event = {
    event_id: eventId,
    timestamp: Date.now() / 1000,
    platform: "javascript",
    level: "error",
    environment:
      process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ||
      process.env.SENTRY_ENVIRONMENT ||
      process.env.NODE_ENV ||
      "development",
    exception: {
      values: [{ type: err.name || "Error", value: err.message }],
    },
    tags: { service: "dink-web" },
    extra: { ...context, stack: err.stack },
  };

  try {
    const url = `https://${cfg.host}/api/${cfg.projectId}/store/`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${cfg.publicKey}, sentry_client=dink-web/1.0`,
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) logWarn("sentry.send_fail", { status: res.status });
    else logDebug("sentry.sent", { eventId });
  } catch (sendErr) {
    logWarn("sentry.send_error", {
      message: sendErr instanceof Error ? sendErr.message : String(sendErr),
    });
  }
}
