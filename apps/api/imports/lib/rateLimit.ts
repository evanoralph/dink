import { Meteor } from "meteor/meteor";
import { logWarn } from "./logger";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export type RateLimitOpts = {
  key: string;
  limit: number;
  windowMs: number;
};

/** Simple in-memory rate limit (P1-20). Fine for single-node MVP. */
export function assertRateLimit(opts: RateLimitOpts) {
  const now = Date.now();
  const existing = buckets.get(opts.key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(opts.key, { count: 1, resetAt: now + opts.windowMs });
    return;
  }
  existing.count += 1;
  if (existing.count > opts.limit) {
    logWarn("rateLimit.hit", { key: opts.key, count: existing.count, limit: opts.limit });
    throw new Meteor.Error("rate-limited", "Too many requests. Try again shortly.");
  }
}

export function clientKeyFromReq(req: {
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
}): string {
  const xf = req.headers["x-forwarded-for"];
  const forwarded = Array.isArray(xf) ? xf[0] : xf;
  const ip =
    (forwarded && forwarded.split(",")[0]?.trim()) ||
    req.socket?.remoteAddress ||
    "unknown";
  return ip;
}
