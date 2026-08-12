/**
 * P1-28: optional Sentry reporter (no SDK required).
 * Set SENTRY_DSN to enable; otherwise no-ops after a debug log once.
 */
import { logDebug, logWarn } from "./logger";

type SentryParsed = {
  publicKey: string;
  host: string;
  projectId: string;
};

let parsed: SentryParsed | null | undefined;
let loggedSkip = false;

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
  const dsn = process.env.SENTRY_DSN || "";
  if (!dsn) {
    parsed = null;
    if (!loggedSkip) {
      loggedSkip = true;
      logDebug("sentry.disabled", { reason: "no_SENTRY_DSN" });
    }
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

  const event = {
    event_id: cryptoRandom(),
    timestamp: Date.now() / 1000,
    platform: "node",
    level: "error",
    server_name: process.env.ROOT_URL || "dink-api",
    environment: process.env.SENTRY_ENVIRONMENT || process.env.NODE_ENV || "development",
    release: process.env.SENTRY_RELEASE || undefined,
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message,
          stacktrace: err.stack
            ? { frames: [{ filename: "app", function: "captureException", lineno: 0 }] }
            : undefined,
        },
      ],
    },
    tags: { service: "dink-api", ...(context.tags as object) },
    extra: { ...context, stack: err.stack },
  };

  try {
    const url = `https://${cfg.host}/api/${cfg.projectId}/store/`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_key=${cfg.publicKey}, sentry_client=dink-api/1.0`,
      },
      body: JSON.stringify(event),
    });
    if (!res.ok) {
      logWarn("sentry.send_fail", { status: res.status });
    } else {
      logDebug("sentry.sent", { eventId: event.event_id });
    }
  } catch (sendErr) {
    logWarn("sentry.send_error", {
      message: sendErr instanceof Error ? sendErr.message : String(sendErr),
    });
  }
}

function cryptoRandom(): string {
  // 32 hex chars — good enough for event id without importing crypto in all contexts
  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256));
  return bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}
