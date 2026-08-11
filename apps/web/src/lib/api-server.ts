import { cookies } from "next/headers";
import { AUTH_COOKIE_NAME, METEOR_API_URL } from "./config";
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
  token?: string | null;
  cache?: RequestCache;
};

async function getTokenFromCookies() {
  try {
    const jar = await cookies();
    return jar.get(AUTH_COOKIE_NAME)?.value || null;
  } catch {
    return null;
  }
}

export async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const token = options.token === undefined ? await getTokenFromCookies() : options.token;
  const url = `${METEOR_API_URL}${path}`;
  const started = Date.now();
  logDebug("api.fetch.start", { path, method: options.method || "GET" });

  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache || "no-store",
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const err = data as { error?: string; message?: string };
    logError("api.fetch.fail", {
      path,
      status: res.status,
      code: err.error,
      durationMs: Date.now() - started,
    });
    throw new ApiError(res.status, err.error || "error", err.message || "Request failed");
  }

  logInfo("api.fetch.ok", { path, status: res.status, durationMs: Date.now() - started });
  return data as T;
}
