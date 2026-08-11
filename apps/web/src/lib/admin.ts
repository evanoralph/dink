export type AdminListResult<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};

export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function sp(params: AdminSearchParams, key: string, fallback = "") {
  const v = params[key];
  if (Array.isArray(v)) return v[0] || fallback;
  return v || fallback;
}

export function buildQuery(params: AdminSearchParams, extras: Record<string, string | number | undefined> = {}) {
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value)) {
      if (value[0]) qs.set(key, value[0]);
    } else {
      qs.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(extras)) {
    if (value == null || value === "") continue;
    qs.set(key, String(value));
  }
  const s = qs.toString();
  return s ? `?${s}` : "";
}

export function formatMoney(amount: number, currency = "PHP") {
  try {
    return new Intl.NumberFormat("en-PH", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(amount || 0);
  } catch {
    return `₱${amount || 0}`;
  }
}

export function formatDate(value?: string | Date | null) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString();
}

export const BOOKING_STATUSES = [
  "draft",
  "pending_payment",
  "confirmed",
  "cancelled",
  "completed",
  "expired",
] as const;

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded", "void"] as const;
export const VENUE_STATUSES = ["pending", "approved", "rejected", "suspended"] as const;
export const GAME_STATUSES = ["open", "full", "cancelled", "completed"] as const;
export const MATCH_STATUSES = ["pending", "submitted", "confirmed"] as const;
export const ALL_ROLES = [
  "player",
  "coach",
  "organizer",
  "venue_staff",
  "venue_owner",
  "admin",
] as const;
