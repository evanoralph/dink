/**
 * P2-10: concurrent booking create on the same court+slot.
 * Requires running Meteor API + seed venues.
 *
 *   METEOR_API_URL=http://localhost:3001 node scripts/load-test-bookings.mjs
 */
import { randomBytes } from "node:crypto";

const API = process.env.METEOR_API_URL || "http://127.0.0.1:3001";
// Stay under REST signup rate limit (10 / 15min / IP): admin signup + N racers.
const CONCURRENCY = Math.min(9, Math.max(4, Number(process.env.LOAD_CONCURRENCY || 8)));

function log(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", event, ...fields }));
}

function fail(message, fields = {}) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "load.fail",
      message,
      ...fields,
    }),
  );
  process.exit(1);
}

async function api(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function signup() {
  const suffix = randomBytes(4).toString("hex");
  const email = `load_${suffix}@dink.test`;
  const password = `Load_${suffix}!xx`;
  const res = await api("/api/v1/auth/signup", {
    method: "POST",
    body: { email, password, displayName: `Load ${suffix}` },
  });
  if (!res.ok || !res.data.loginToken) fail("signup_failed", { status: res.status, data: res.data });
  return { token: res.data.loginToken, email };
}

async function main() {
  log("load.start", { api: API, concurrency: CONCURRENCY });

  const health = await api("/api/v1/health");
  if (!health.ok) fail("api_unreachable", { status: health.status });

  const admin = await signup();
  const venuesRes = await api("/api/v1/venues", { token: admin.token });
  const venues = Array.isArray(venuesRes.data) ? venuesRes.data : venuesRes.data?.venues || [];
  const venue = venues[0];
  if (!venue?._id) fail("no_venue");

  const date = new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const avail = await api(
    `/api/v1/venues/${venue._id}/availability?date=${encodeURIComponent(date)}`,
    { token: admin.token },
  );
  const slots = Array.isArray(avail.data) ? avail.data : avail.data.slots || [];
  let slot = slots.find((s) => s.available && s.courtId);
  if (!slot) {
    const detail = await api(`/api/v1/venues/${venue._id}`, { token: admin.token });
    const court = detail.data?.courts?.[0] || detail.data?.venue?.courts?.[0];
    if (!court?._id) fail("no_open_slot", { date, venueId: venue._id });
    const start = new Date(Date.now() + 40 * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    slot = {
      courtId: court._id,
      startsAt: start.toISOString(),
      endsAt: new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
    };
    log("load.slot.fallback", { venueId: venue._id, courtId: slot.courtId, startsAt: slot.startsAt });
  }

  log("load.slot", { venueId: venue._id, courtId: slot.courtId, startsAt: slot.startsAt });

  const users = await Promise.all(Array.from({ length: CONCURRENCY }, () => signup()));

  const results = await Promise.all(
    users.map((u, i) =>
      api("/api/v1/bookings", {
        method: "POST",
        token: u.token,
        body: {
          venueId: venue._id,
          courtId: slot.courtId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          participantCount: 1,
          idempotencyKey: `load_${i}_${randomBytes(4).toString("hex")}`,
        },
      }),
    ),
  );

  const ok = results.filter((r) => r.ok);
  const taken = results.filter((r) => !r.ok && r.data?.error === "slot-taken");
  const other = results.filter((r) => !r.ok && r.data?.error !== "slot-taken");

  log("load.results", {
    ok: ok.length,
    slotTaken: taken.length,
    otherFail: other.length,
    otherErrors: other.slice(0, 3).map((r) => r.data?.error || r.status),
  });

  if (ok.length !== 1) {
    fail("expected_exactly_one_hold", { ok: ok.length, taken: taken.length });
  }
  if (taken.length + other.length !== CONCURRENCY - 1) {
    fail("unexpected_failures", { taken: taken.length, other: other.length });
  }

  log("load.ok", { note: "unique active slot hold held under concurrency" });
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
