/**
 * P1-33: simple in-memory counters for ops visibility (single-node MVP).
 */
import { logInfo } from "./logger";

const counters = new Map<string, number>();

export function incrMetric(name: string, by = 1): number {
  const next = (counters.get(name) || 0) + by;
  counters.set(name, next);
  return next;
}

export function getMetrics(): Record<string, number> {
  return Object.fromEntries(counters.entries());
}

export function logMetricSnapshot(event = "metrics.snapshot") {
  logInfo(event, { metrics: getMetrics() });
}
