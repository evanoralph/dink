/**
 * P1-31: full API journey smoke (signup → book → stub pay → game → score).
 * Requires a running Meteor API (PAYMENT_PROVIDER=stub).
 *
 *   METEOR_API_URL=http://localhost:3001 node scripts/e2e-journey.mjs
 *
 * Skips cleanly when SKIP_E2E_JOURNEY=1 or API unreachable (exit 0) unless
 * REQUIRE_E2E_JOURNEY=1 (then exit 1).
 */
import { randomBytes } from "node:crypto";

const API = process.env.METEOR_API_URL || process.env.E2E_API_URL || "http://127.0.0.1:3001";
const requireJourney = process.env.REQUIRE_E2E_JOURNEY === "1";

function log(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", event, ...fields }));
}

function fail(message, fields = {}) {
  console.error(
    JSON.stringify({
      ts: new Date().toISOString(),
      level: "error",
      event: "e2e.journey.fail",
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
  if (!res.ok) {
    throw Object.assign(new Error(data.message || `HTTP ${res.status}`), {
      status: res.status,
      data,
    });
  }
  return data;
}

async function main() {
  if (process.env.SKIP_E2E_JOURNEY === "1") {
    log("e2e.journey.skip", { reason: "SKIP_E2E_JOURNEY" });
    return;
  }

  log("e2e.journey.start", { api: API });

  try {
    await api("/api/v1/health");
  } catch (err) {
    log("e2e.journey.api_unreachable", {
      message: err instanceof Error ? err.message : String(err),
    });
    if (requireJourney) fail("api_unreachable");
    process.exit(0);
  }

  const suffix = randomBytes(4).toString("hex");
  const email = `e2e_${suffix}@dink.test`;
  const password = `E2eTest_${suffix}!`;

  const signup = await api("/api/v1/auth/signup", {
    method: "POST",
    body: { email, password, displayName: `E2E ${suffix}` },
  });
  const token = signup.loginToken;
  if (!token) fail("no_login_token");
  log("e2e.journey.signup", { userId: signup.user?._id });

  await api("/api/v1/me/profile", {
    method: "PATCH",
    token,
    body: { city: "Angeles", skillLevel: 3.5, onboardingComplete: true },
  });

  const venues = await api("/api/v1/venues", { token });
  const venue = Array.isArray(venues) ? venues[0] : venues?.venues?.[0];
  if (!venue?._id) fail("no_venue");

  const detail = await api(`/api/v1/venues/${venue._id}`, { token });
  const court = detail.courts?.[0] || detail.court || detail.venue?.courts?.[0];
  // availability: try venue availability endpoint shape used by app
  let startsAt;
  let endsAt;
  let courtId = court?._id;

  try {
    const date = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const avail = await api(
      `/api/v1/venues/${venue._id}/availability?date=${encodeURIComponent(date)}`,
      { token },
    );
    const slots = Array.isArray(avail) ? avail : avail.slots || [];
    const slot = slots.find((s) => s.available && s.courtId);
    if (slot) {
      startsAt = slot.startsAt;
      endsAt = slot.endsAt;
      courtId = slot.courtId;
    }
  } catch {
    // fallback synthetic hour below
  }

  if (!startsAt || !endsAt || !courtId) {
    const start = new Date(Date.now() + 3 * 60 * 60 * 1000);
    start.setMinutes(0, 0, 0);
    startsAt = start.toISOString();
    endsAt = new Date(start.getTime() + 60 * 60 * 1000).toISOString();
    if (!courtId) fail("no_court");
  }

  const booking = await api("/api/v1/bookings", {
    method: "POST",
    token,
    body: {
      venueId: venue._id,
      courtId,
      startsAt,
      endsAt,
      participantCount: 4,
      idempotencyKey: `e2e_${suffix}`,
    },
  });
  log("e2e.journey.booking", { bookingId: booking._id, status: booking.status });

  const checkout = await api(`/api/v1/bookings/${booking._id}/checkout`, {
    method: "POST",
    token,
    body: {},
  });
  log("e2e.journey.checkout", {
    bookingStatus: checkout.booking?.status || checkout.status,
    provider: checkout.provider,
  });

  const game = await api("/api/v1/games", {
    method: "POST",
    token,
    body: {
      venueId: venue._id,
      courtId,
      startsAt,
      format: "doubles",
      skillMin: 3,
      skillMax: 4,
      capacity: 4,
      visibility: "public",
    },
  });
  log("e2e.journey.game", { gameId: game._id, inviteCode: game.inviteCode });

  // Second player for score (need ≥2 ids) — create buddy and join
  const buddyEmail = `e2e_b_${suffix}@dink.test`;
  const buddy = await api("/api/v1/auth/signup", {
    method: "POST",
    body: { email: buddyEmail, password, displayName: `Buddy ${suffix}` },
  });
  await api(`/api/v1/games/${game._id}/join`, {
    method: "POST",
    token: buddy.loginToken,
    body: {},
  });
  log("e2e.journey.join", { buddyId: buddy.user?._id });

  const match = await api("/api/v1/matches", {
    method: "POST",
    token,
    body: {
      gameId: game._id,
      sets: [{ setNumber: 1, team1Score: 11, team2Score: 7 }],
      team1UserIds: [signup.user._id],
      team2UserIds: [buddy.user._id],
    },
  });
  log("e2e.journey.match", { matchId: match.match?._id || match._id });

  await api(`/api/v1/matches/${match.match?._id || match._id}/confirm`, {
    method: "POST",
    token: buddy.loginToken,
    body: {},
  });
  log("e2e.journey.confirm");

  log("e2e.journey.ok", { email, bookingId: booking._id, gameId: game._id });
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
