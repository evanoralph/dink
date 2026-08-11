import { logDebug, logError, logInfo } from "./logger";

export class ApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type FetchOptions = {
  method?: string;
  body?: unknown;
};

/** Browser-side fetch via Next BFF so cookies stay httpOnly. */
export async function clientApiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const started = Date.now();
  logDebug("api.client.start", { path, method: options.method || "GET" });
  const res = await fetch(`/api/proxy${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) {
    logError("api.client.fail", { path, status: res.status, durationMs: Date.now() - started });
    throw new ApiError(res.status, data.error || "error", data.message || "Request failed");
  }
  logInfo("api.client.ok", { path, status: res.status, durationMs: Date.now() - started });
  return data as T;
}
