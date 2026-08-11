import { Match } from "meteor/check";

export type AdminListInput = {
  q?: string;
  status?: string;
  venueId?: string;
  city?: string;
  userId?: string;
  courtId?: string;
  role?: string;
  gameId?: string;
  read?: string | boolean;
  type?: string;
  actorUserId?: string;
  action?: string;
  active?: string | boolean;
  from?: string;
  to?: string;
  page?: number | string;
  pageSize?: number | string;
  sortBy?: string;
  sortDir?: "asc" | "desc" | string;
  days?: number | string;
  entity?: string;
};

export const adminListMatcher = {
  q: Match.Optional(String),
  status: Match.Optional(String),
  venueId: Match.Optional(String),
  city: Match.Optional(String),
  userId: Match.Optional(String),
  courtId: Match.Optional(String),
  role: Match.Optional(String),
  gameId: Match.Optional(String),
  read: Match.Optional(Match.OneOf(String, Boolean)),
  type: Match.Optional(String),
  actorUserId: Match.Optional(String),
  action: Match.Optional(String),
  active: Match.Optional(Match.OneOf(String, Boolean)),
  from: Match.Optional(String),
  to: Match.Optional(String),
  page: Match.Optional(Match.OneOf(Number, String)),
  pageSize: Match.Optional(Match.OneOf(Number, String)),
  sortBy: Match.Optional(String),
  sortDir: Match.Optional(String),
  days: Match.Optional(Match.OneOf(Number, String)),
  entity: Match.Optional(String),
};

export function parsePage(input: AdminListInput = {}) {
  const page = Math.max(1, Number(input.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(input.pageSize) || 25));
  const skip = (page - 1) * pageSize;
  const sortDir = input.sortDir === "asc" ? 1 : -1;
  return { page, pageSize, skip, sortDir };
}

export function parseDateRange(input: AdminListInput = {}) {
  const from = input.from ? new Date(input.from) : undefined;
  const to = input.to ? new Date(input.to) : undefined;
  if (from && Number.isNaN(from.getTime())) return { from: undefined, to };
  if (to && Number.isNaN(to.getTime())) return { from, to: undefined };
  return { from, to };
}

export function applyDateFilter(
  query: Record<string, unknown>,
  field: string,
  from?: Date,
  to?: Date,
) {
  if (!from && !to) return;
  const range: Record<string, Date> = {};
  if (from) range.$gte = from;
  if (to) range.$lte = to;
  query[field] = range;
}

export function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function toCsv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "empty\n";
  const keys = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const escape = (v: unknown) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  const lines = [keys.join(",")];
  for (const row of rows) {
    lines.push(keys.map((k) => escape(row[k])).join(","));
  }
  return lines.join("\n");
}

export function dayKey(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function eachDayKeys(from: Date, to: Date) {
  const keys: string[] = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);
  while (cursor <= end) {
    keys.push(dayKey(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return keys;
}
