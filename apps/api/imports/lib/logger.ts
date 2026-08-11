type LogFields = Record<string, unknown>;

function emit(level: "info" | "warn" | "error" | "debug", event: string, fields: LogFields = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    event,
    ...fields,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logInfo(event: string, fields?: LogFields) {
  emit("info", event, fields);
}

export function logWarn(event: string, fields?: LogFields) {
  emit("warn", event, fields);
}

export function logError(event: string, fields?: LogFields) {
  emit("error", event, fields);
}

export function logDebug(event: string, fields?: LogFields) {
  if (process.env.DEBUG === "1" || process.env.NODE_ENV !== "production") {
    emit("debug", event, fields);
  }
}

export async function withMethodLog<T>(
  method: string,
  userId: string | null | undefined,
  fn: () => Promise<T> | T,
): Promise<T> {
  const started = Date.now();
  try {
    const result = await fn();
    logInfo("method.ok", { method, userId: userId || null, durationMs: Date.now() - started });
    return result;
  } catch (error) {
    const err = error as { error?: string; reason?: string; message?: string };
    logError("method.fail", {
      method,
      userId: userId || null,
      durationMs: Date.now() - started,
      code: err.error || "error",
      reason: err.reason || err.message,
    });
    throw error;
  }
}
