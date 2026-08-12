import bodyParser from "body-parser";
import cors from "cors";
import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import type { IncomingMessage, ServerResponse } from "http";
import { resolveUserFromRequest } from "../../lib/auth";
import { logError, logInfo } from "../../lib/logger";
import { getMetrics } from "../../lib/metrics";
import { assertRateLimit, clientKeyFromReq } from "../../lib/rateLimit";
import { runWithUserId } from "../../lib/requestContext";
import { captureException } from "../../lib/sentry";

type Req = IncomingMessage & { body?: unknown; url?: string; rawBody?: string };
type Res = ServerResponse;

const ALLOWED_ORIGINS = (
  process.env.CORS_ORIGINS ||
  "http://localhost:3000,http://127.0.0.1:3000"
).split(",");

function send(res: Res, status: number, data: unknown) {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseUrl(req: Req) {
  const host = req.headers.host || "localhost";
  return new URL(req.url || "/", `http://${host}`);
}

async function readJson(req: Req): Promise<unknown> {
  if (req.body !== undefined) return req.body;
  return new Promise((resolve, reject) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
    });
    req.on("end", () => {
      if (!raw) return resolve({});
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function handler(req: Req, res: Res) {
  const url = parseUrl(req);
  if (!url.pathname.startsWith("/api/v1")) return false;

  const started = Date.now();
  const method = (req.method || "GET").toUpperCase();
  logInfo("rest.hit", { method, path: url.pathname });

  try {
    const auth = await resolveUserFromRequest(req);
    const userId = auth?.user?._id || null;
    const body = ["POST", "PATCH", "PUT"].includes(method) ? await readJson(req) : {};

    const run = async <T>(name: string, ...args: unknown[]) =>
      runWithUserId(userId, async () => (await Meteor.callAsync(name, ...args)) as T);

    if (method === "GET" && url.pathname === "/api/v1/health") {
      send(res, 200, {
        ok: true,
        service: "dink-api",
        mongo: Boolean(process.env.MONGO_URL),
        time: new Date().toISOString(),
        // P1-33: conflict counter for uptime/alert dashboards
        metrics: getMetrics(),
      });
      return true;
    }

    // P0-04: public subset for marketing + checkout (no auth).
    if (method === "GET" && url.pathname === "/api/v1/feature-flags") {
      send(res, 200, await Meteor.callAsync("featureFlags.public"));
      return true;
    }

    // P1-01: public payment mode for web checkout UX.
    if (method === "GET" && url.pathname === "/api/v1/payments/config") {
      send(res, 200, await Meteor.callAsync("payments.config"));
      return true;
    }

    if (method === "POST" && url.pathname === "/api/v1/auth/signup") {
      // P1-20: slow signup spam
      assertRateLimit({
        key: `signup:${clientKeyFromReq(req)}`,
        limit: 10,
        windowMs: 15 * 60_000,
      });
      send(res, 200, await Meteor.callAsync("auth.signup", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/login") {
      assertRateLimit({
        key: `login:${clientKeyFromReq(req)}`,
        limit: 20,
        windowMs: 15 * 60_000,
      });
      send(res, 200, await Meteor.callAsync("auth.login", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/logout") {
      // P1-16: revoke the resume token that authenticated this request
      send(res, 200, await run("auth.logout", auth?.token));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/forgot-password") {
      assertRateLimit({
        key: `forgot:${clientKeyFromReq(req)}`,
        limit: 5,
        windowMs: 15 * 60_000,
      });
      send(res, 200, await Meteor.callAsync("auth.forgotPassword", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/auth/reset-password") {
      assertRateLimit({
        key: `reset:${clientKeyFromReq(req)}`,
        limit: 10,
        windowMs: 15 * 60_000,
      });
      send(res, 200, await Meteor.callAsync("auth.resetPassword", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/me") {
      send(res, 200, await run("me.get"));
      return true;
    }
    if (method === "PATCH" && url.pathname === "/api/v1/me/profile") {
      send(res, 200, await run("me.updateProfile", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/me/export") {
      send(res, 200, await run("me.export"));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/me/delete") {
      send(res, 200, await run("me.delete", body));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/venues") {
      const filters: {
        city?: string;
        indoor?: boolean;
        covered?: boolean;
        airConditioned?: boolean;
        q?: string;
        lat?: number;
        lng?: number;
        radiusKm?: number;
      } = {};
      const city = url.searchParams.get("city");
      const indoorParam = url.searchParams.get("indoor");
      const coveredParam = url.searchParams.get("covered");
      const acParam = url.searchParams.get("airConditioned");
      const q = url.searchParams.get("q");
      const latParam = url.searchParams.get("lat");
      const lngParam = url.searchParams.get("lng");
      const radiusParam = url.searchParams.get("radiusKm");
      if (city) filters.city = city;
      if (indoorParam !== null) filters.indoor = indoorParam === "true";
      if (coveredParam !== null) filters.covered = coveredParam === "true";
      if (acParam !== null) filters.airConditioned = acParam === "true";
      if (q) filters.q = q;
      if (latParam !== null) filters.lat = Number(latParam);
      if (lngParam !== null) filters.lng = Number(lngParam);
      if (radiusParam !== null) filters.radiusKm = Number(radiusParam);
      logInfo("rest.venues.list", {
        city: filters.city,
        indoor: filters.indoor,
        covered: filters.covered,
        q: filters.q,
        nearby: Boolean(filters.lat != null && filters.lng != null),
      });
      send(res, 200, await run("venues.list", filters));
      return true;
    }

    const venueMatch = url.pathname.match(/^\/api\/v1\/venues\/([^/]+)$/);
    if (method === "GET" && venueMatch) {
      send(res, 200, await run("venues.get", venueMatch[1]));
      return true;
    }
    if (method === "PATCH" && venueMatch) {
      send(
        res,
        200,
        await run("venues.update", { ...(body as object), venueId: venueMatch[1] }),
      );
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venues") {
      send(res, 200, await run("venues.create", body));
      return true;
    }
    const venuePacksPublic = url.pathname.match(/^\/api\/v1\/venues\/([^/]+)\/packs$/);
    if (method === "GET" && venuePacksPublic) {
      send(res, 200, await run("packs.list", venuePacksPublic[1]));
      return true;
    }
    const availMatch = url.pathname.match(/^\/api\/v1\/venues\/([^/]+)\/availability$/);
    if (method === "GET" && availMatch) {
      const date = url.searchParams.get("date") || new Date().toISOString().slice(0, 10);
      send(res, 200, await run("venues.availability", { venueId: availMatch[1], date }));
      return true;
    }
    const courtsMatch = url.pathname.match(/^\/api\/v1\/venues\/([^/]+)\/courts$/);
    if (method === "POST" && courtsMatch) {
      send(
        res,
        200,
        await run("courts.create", { ...(body as object), venueId: courtsMatch[1] }),
      );
      return true;
    }
    const reviewsMatch = url.pathname.match(/^\/api\/v1\/venues\/([^/]+)\/reviews$/);
    if (method === "GET" && reviewsMatch) {
      send(res, 200, await run("reviews.listForVenue", reviewsMatch[1]));
      return true;
    }
    if (method === "POST" && reviewsMatch) {
      send(
        res,
        200,
        await run("reviews.create", {
          ...(body as object),
          venueId: reviewsMatch[1],
        }),
      );
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/bookings") {
      send(res, 200, await run("bookings.mine"));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/bookings") {
      send(res, 200, await run("bookings.create", body));
      return true;
    }
    // Must be registered before /bookings/:id
    if (method === "GET" && url.pathname === "/api/v1/bookings/cancel-policy") {
      send(res, 200, await run("bookings.cancelPolicy"));
      return true;
    }
    const bookingMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)$/);
    if (method === "GET" && bookingMatch) {
      send(res, 200, await run("bookings.get", bookingMatch[1]));
      return true;
    }
    const checkoutMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/checkout$/);
    if (method === "POST" && checkoutMatch) {
      assertRateLimit({
        key: `checkout:${userId || clientKeyFromReq(req)}`,
        limit: 30,
        windowMs: 15 * 60_000,
      });
      send(
        res,
        200,
        await run("bookings.checkout", {
          bookingId: checkoutMatch[1],
          ...(body as object),
        }),
      );
      return true;
    }
    const cancelMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/cancel$/);
    if (method === "POST" && cancelMatch) {
      send(res, 200, await run("bookings.cancel", cancelMatch[1]));
      return true;
    }
    const inviteMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/invite$/);
    if (method === "POST" && inviteMatch) {
      send(
        res,
        200,
        await run("bookings.invite", { ...(body as object), bookingId: inviteMatch[1] }),
      );
      return true;
    }
    const remindMatch = url.pathname.match(/^\/api\/v1\/bookings\/([^/]+)\/remind$/);
    if (method === "POST" && remindMatch) {
      send(res, 200, await run("bookings.remindUnpaid", { bookingId: remindMatch[1] }));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/notifications") {
      send(
        res,
        200,
        await run("notifications.list", {
          limit: url.searchParams.get("limit")
            ? Number(url.searchParams.get("limit"))
            : undefined,
          unreadOnly: url.searchParams.get("unreadOnly") === "true",
        }),
      );
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/notifications/read") {
      send(res, 200, await run("notifications.markRead", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/bookings/manual") {
      send(res, 200, await run("bookings.manual", body));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/games") {
      const filters: { city?: string; skill?: number; groupId?: string } = {};
      const city = url.searchParams.get("city");
      const skill = url.searchParams.get("skill");
      const groupId = url.searchParams.get("groupId");
      if (city) filters.city = city;
      if (skill) filters.skill = Number(skill);
      if (groupId) filters.groupId = groupId;
      send(res, 200, await run("games.list", filters));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/games") {
      send(res, 200, await run("games.create", body));
      return true;
    }
    // P1-23: join by invite code (before /games/:id)
    if (method === "POST" && url.pathname === "/api/v1/games/join-by-code") {
      const code =
        typeof body === "object" && body && "code" in body
          ? String((body as { code: unknown }).code)
          : "";
      send(res, 200, await run("games.joinByCode", code));
      return true;
    }
    const gameMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)$/);
    if (method === "GET" && gameMatch) {
      send(res, 200, await run("games.get", gameMatch[1]));
      return true;
    }
    const joinMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/join$/);
    if (method === "POST" && joinMatch) {
      send(res, 200, await run("games.join", joinMatch[1]));
      return true;
    }
    const leaveMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/leave$/);
    if (method === "POST" && leaveMatch) {
      send(res, 200, await run("games.leave", leaveMatch[1]));
      return true;
    }
    const playAgainMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/play-again$/);
    if (method === "POST" && playAgainMatch) {
      send(res, 200, await run("games.playAgain", playAgainMatch[1]));
      return true;
    }
    const rsvpMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/rsvp$/);
    if (method === "POST" && rsvpMatch) {
      send(
        res,
        200,
        await run("games.rsvp", { ...(body as object), gameId: rsvpMatch[1] }),
      );
      return true;
    }
    const repeatMatch = url.pathname.match(/^\/api\/v1\/games\/([^/]+)\/repeat-weekly$/);
    if (method === "POST" && repeatMatch) {
      send(res, 200, await run("games.repeatWeekly", repeatMatch[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/groups") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("groups.list", city ? { city } : {}));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/groups") {
      send(res, 200, await run("groups.create", body));
      return true;
    }
    const groupFeed = url.pathname.match(/^\/api\/v1\/groups\/([^/]+)\/feed$/);
    if (method === "GET" && groupFeed) {
      send(res, 200, await run("groups.feed", groupFeed[1]));
      return true;
    }
    const groupJoin = url.pathname.match(/^\/api\/v1\/groups\/([^/]+)\/join$/);
    if (method === "POST" && groupJoin) {
      send(res, 200, await run("groups.join", groupJoin[1]));
      return true;
    }
    const groupLeave = url.pathname.match(/^\/api\/v1\/groups\/([^/]+)\/leave$/);
    if (method === "POST" && groupLeave) {
      send(res, 200, await run("groups.leave", groupLeave[1]));
      return true;
    }
    const groupGet = url.pathname.match(/^\/api\/v1\/groups\/([^/]+)$/);
    if (method === "GET" && groupGet) {
      send(res, 200, await run("groups.get", groupGet[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/chat") {
      send(
        res,
        200,
        await run("chat.list", {
          channelType: url.searchParams.get("channelType"),
          channelId: url.searchParams.get("channelId"),
          after: url.searchParams.get("after") || undefined,
        }),
      );
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/chat") {
      assertRateLimit({
        key: `chat:${userId || clientKeyFromReq(req)}`,
        limit: 40,
        windowMs: 60_000,
      });
      send(res, 200, await run("chat.post", body));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/friends") {
      send(res, 200, await run("friends.list"));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/friends/played-with") {
      send(res, 200, await run("friends.playedWith"));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/friends/request") {
      send(res, 200, await run("friends.request", (body as { userId?: string }).userId));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/friends/accept") {
      send(res, 200, await run("friends.accept", (body as { userId?: string }).userId));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/coaches") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("coaches.list", city ? { city } : {}));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/coaches/profile") {
      send(res, 200, await run("coaches.upsertProfile", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/coaches/requests") {
      send(res, 200, await run("coaches.myRequests"));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/coaches/requests") {
      send(res, 200, await run("coaches.request", body));
      return true;
    }
    const coachRespond = url.pathname.match(/^\/api\/v1\/coaches\/requests\/([^/]+)\/respond$/);
    if (method === "POST" && coachRespond) {
      send(
        res,
        200,
        await run("coaches.respond", { ...(body as object), requestId: coachRespond[1] }),
      );
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/coaches/reviews") {
      send(res, 200, await run("coaches.review", body));
      return true;
    }
    const coachGet = url.pathname.match(/^\/api\/v1\/coaches\/([^/]+)$/);
    if (method === "GET" && coachGet) {
      send(res, 200, await run("coaches.get", coachGet[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/ratings/rules") {
      send(res, 200, await Meteor.callAsync("ratings.rules"));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/ratings/me") {
      send(res, 200, await run("ratings.me"));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/ratings/history") {
      send(res, 200, await run("ratings.history", { userId: url.searchParams.get("userId") || undefined }));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/ratings/leaderboard") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("ratings.leaderboard", city ? { city } : {}));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/leagues") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("leagues.list", city ? { city } : {}));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/leagues") {
      send(res, 200, await run("leagues.create", body));
      return true;
    }
    const leagueJoin = url.pathname.match(/^\/api\/v1\/leagues\/([^/]+)\/join$/);
    if (method === "POST" && leagueJoin) {
      send(res, 200, await run("leagues.join", leagueJoin[1]));
      return true;
    }
    const leagueResult = url.pathname.match(/^\/api\/v1\/leagues\/([^/]+)\/results$/);
    if (method === "POST" && leagueResult) {
      send(res, 200, await run("leagues.recordResult", { ...(body as object), leagueId: leagueResult[1] }));
      return true;
    }
    const leagueGet = url.pathname.match(/^\/api\/v1\/leagues\/([^/]+)$/);
    if (method === "GET" && leagueGet) {
      send(res, 200, await run("leagues.get", leagueGet[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/ladders") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("ladders.list", city ? { city } : {}));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/ladders") {
      send(res, 200, await run("ladders.create", body));
      return true;
    }
    const ladderJoin = url.pathname.match(/^\/api\/v1\/ladders\/([^/]+)\/join$/);
    if (method === "POST" && ladderJoin) {
      send(res, 200, await run("ladders.join", ladderJoin[1]));
      return true;
    }
    const ladderChallenge = url.pathname.match(/^\/api\/v1\/ladders\/([^/]+)\/challenge$/);
    if (method === "POST" && ladderChallenge) {
      send(res, 200, await run("ladders.challenge", { ...(body as object), ladderId: ladderChallenge[1] }));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/ladders/challenges/respond") {
      send(res, 200, await run("ladders.respond", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/ladders/challenges/result") {
      send(res, 200, await run("ladders.recordResult", body));
      return true;
    }
    const ladderGet = url.pathname.match(/^\/api\/v1\/ladders\/([^/]+)$/);
    if (method === "GET" && ladderGet) {
      send(res, 200, await run("ladders.get", ladderGet[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/tournaments") {
      const city = url.searchParams.get("city") || undefined;
      send(res, 200, await run("tournaments.list", city ? { city } : {}));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/tournaments") {
      send(res, 200, await run("tournaments.create", body));
      return true;
    }
    const tReg = url.pathname.match(/^\/api\/v1\/tournaments\/([^/]+)\/register$/);
    if (method === "POST" && tReg) {
      send(res, 200, await run("tournaments.register", tReg[1]));
      return true;
    }
    const tStart = url.pathname.match(/^\/api\/v1\/tournaments\/([^/]+)\/start$/);
    if (method === "POST" && tStart) {
      send(res, 200, await run("tournaments.start", tStart[1]));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/tournaments/matches/winner") {
      send(res, 200, await run("tournaments.reportWinner", body));
      return true;
    }
    const tGet = url.pathname.match(/^\/api\/v1\/tournaments\/([^/]+)$/);
    if (method === "GET" && tGet) {
      send(res, 200, await run("tournaments.get", tGet[1]));
      return true;
    }

    if (method === "GET" && url.pathname === "/api/v1/me/passes") {
      send(res, 200, await run("packs.mine"));
      return true;
    }

    if (method === "POST" && url.pathname === "/api/v1/reports") {
      assertRateLimit({
        key: `report:${userId || clientKeyFromReq(req)}`,
        limit: 10,
        windowMs: 15 * 60_000,
      });
      send(res, 200, await run("reports.create", body));
      return true;
    }

    if (method === "POST" && url.pathname === "/api/v1/matches") {
      send(res, 200, await run("matches.submitResult", body));
      return true;
    }
    const shareMatch = url.pathname.match(/^\/api\/v1\/matches\/([^/]+)\/share$/);
    if (method === "GET" && shareMatch) {
      send(res, 200, await Meteor.callAsync("matches.share", shareMatch[1]));
      return true;
    }
    const confirmMatch = url.pathname.match(/^\/api\/v1\/matches\/([^/]+)\/confirm$/);
    if (method === "POST" && confirmMatch) {
      send(res, 200, await run("matches.confirm", confirmMatch[1]));
      return true;
    }
    const disputeMatch = url.pathname.match(/^\/api\/v1\/matches\/([^/]+)\/dispute$/);
    if (method === "POST" && disputeMatch) {
      send(res, 200, await run("matches.dispute", { ...(body as object), matchId: disputeMatch[1] }));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/matches") {
      send(res, 200, await run("matches.history"));
      return true;
    }

    if (method === "POST" && url.pathname === "/api/v1/payments/webhook") {
      const signature =
        (req.headers["paymongo-signature"] as string | undefined) ||
        (req.headers["Paymongo-Signature"] as string | undefined);
      const rawBody =
        (req as Req & { rawBody?: string }).rawBody ||
        (typeof body === "object" ? JSON.stringify(body) : String(body || ""));

      // PayMongo signed webhooks
      if (signature) {
        const { verifyPaymongoSignature } = await import("../../modules/payments/webhookSecurity");
        verifyPaymongoSignature(rawBody, signature);
        send(
          res,
          200,
          await Meteor.callAsync("payments.webhook", {
            paymongo: true,
            event: body,
          }),
        );
        return true;
      }

      // Stub / shared-secret webhook (local + tests)
      send(res, 200, await Meteor.callAsync("payments.webhook", body));
      return true;
    }

    const venueQuery = Object.fromEntries(url.searchParams);

    if (method === "GET" && url.pathname === "/api/v1/venue/dashboard") {
      send(res, 200, await run("venue.dashboard", venueQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/calendar") {
      send(res, 200, await run("venue.calendar", venueQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/courts") {
      send(res, 200, await run("venue.courts.list", venueQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/courts/active") {
      send(res, 200, await run("venue.courts.setActive", body));
      return true;
    }

    if (method === "POST" && url.pathname === "/api/v1/venue/onboard-defaults") {
      send(res, 200, await run("venues.applyOnboardDefaults", body));
      return true;
    }

    // P1-12 / P1-13 / P1-15 — hours, pricing, blackouts
    if (method === "GET" && url.pathname === "/api/v1/venue/availability-rules") {
      send(res, 200, await run("venue.availabilityRules.list", venueQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/availability-rules") {
      send(res, 200, await run("venue.availabilityRules.upsert", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/availability-rules/remove") {
      send(res, 200, await run("venue.availabilityRules.remove", (body as { ruleId: string }).ruleId));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/pricing-rules") {
      send(res, 200, await run("venue.pricingRules.list", venueQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/pricing-rules") {
      send(res, 200, await run("venue.pricingRules.upsert", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/pricing-rules/remove") {
      send(res, 200, await run("venue.pricingRules.remove", (body as { ruleId: string }).ruleId));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/blackouts") {
      send(res, 200, await run("venue.blackouts.list", venueQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/blackouts") {
      send(res, 200, await run("venue.blackouts.create", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/blackouts/remove") {
      send(
        res,
        200,
        await run("venue.blackouts.remove", (body as { blackoutId: string }).blackoutId),
      );
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/bookings") {
      send(res, 200, await run("venue.bookings.list", venueQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/bookings/status") {
      send(res, 200, await run("venue.bookings.setStatus", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/payments") {
      send(res, 200, await run("venue.payments.list", venueQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/reports") {
      send(res, 200, await run("venue.reports.summary", venueQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/reports/export") {
      send(res, 200, await run("venue.reports.export", venueQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/packs") {
      const venueId = url.searchParams.get("venueId");
      if (!venueId) {
        send(res, 400, { error: "venueId required" });
        return true;
      }
      send(res, 200, await run("packs.list", venueId));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/packs") {
      send(res, 200, await run("packs.create", body));
      return true;
    }
    const packBuy = url.pathname.match(/^\/api\/v1\/venue\/packs\/([^/]+)\/buy$/);
    if (method === "POST" && packBuy) {
      send(res, 200, await run("packs.buy", packBuy[1]));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/venue/staff") {
      const venueId = url.searchParams.get("venueId");
      if (!venueId) {
        send(res, 400, { error: "venueId required" });
        return true;
      }
      send(res, 200, await run("venue.staff.list", venueId));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/staff") {
      send(res, 200, await run("venue.staff.add", body));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/venue/staff/remove") {
      send(res, 200, await run("venue.staff.remove", body));
      return true;
    }

    const adminQuery = Object.fromEntries(url.searchParams);

    if (method === "GET" && url.pathname === "/api/v1/admin/dashboard") {
      send(res, 200, await run("admin.dashboard.stats", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/reports") {
      send(res, 200, await run("admin.reports.summary", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/export") {
      send(res, 200, await run("admin.export.csv", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/users") {
      send(res, 200, await run("admin.users.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/users/roles") {
      send(res, 200, await run("admin.users.setRoles", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/venues") {
      send(res, 200, await run("admin.venues.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/venues/status") {
      send(res, 200, await run("admin.venues.setStatus", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/courts") {
      send(res, 200, await run("admin.courts.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/courts/active") {
      send(res, 200, await run("admin.courts.setActive", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/bookings") {
      send(res, 200, await run("admin.bookings.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/bookings/status") {
      send(res, 200, await run("admin.bookings.setStatus", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/payments") {
      send(res, 200, await run("admin.payments.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/payments/status") {
      send(res, 200, await run("admin.payments.setStatus", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/games") {
      send(res, 200, await run("admin.games.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/games/status") {
      send(res, 200, await run("admin.games.setStatus", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/matches") {
      send(res, 200, await run("admin.matches.list", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/notifications") {
      send(res, 200, await run("admin.notifications.list", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/audit") {
      send(res, 200, await run("admin.audit.list", adminQuery));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/moderation") {
      send(res, 200, await run("admin.moderation.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/moderation/resolve") {
      send(res, 200, await run("admin.moderation.resolve", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/disputes") {
      send(res, 200, await run("admin.disputes.list", adminQuery));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/disputes/resolve") {
      send(res, 200, await run("admin.disputes.resolve", body));
      return true;
    }
    if (method === "GET" && url.pathname === "/api/v1/admin/feature-flags") {
      send(res, 200, await run("admin.featureFlags.list"));
      return true;
    }
    if (method === "POST" && url.pathname === "/api/v1/admin/feature-flags") {
      send(res, 200, await run("admin.featureFlags.set", body));
      return true;
    }

    send(res, 404, { error: "not_found", path: url.pathname });
    return true;
  } catch (error) {
    const err = error as { error?: string; reason?: string; message?: string };
    logError("rest.error", {
      path: url.pathname,
      code: err.error,
      reason: err.reason || err.message,
      durationMs: Date.now() - started,
    });
    // Unexpected server errors → Sentry (skip expected client errors)
    if (
      !err.error ||
      !["not-authorized", "invalid-credentials", "forbidden", "not-found", "invalid-body", "rate-limited", "slot-taken", "invalid-token"].includes(
        err.error,
      )
    ) {
      void captureException(error, { path: url.pathname, code: err.error });
    }
    const status =
      err.error === "not-authorized" || err.error === "invalid-credentials"
        ? 401
        : err.error === "suspended" || err.error === "forbidden"
          ? 403
          : err.error === "not-found"
            ? 404
            : err.error === "rate-limited"
              ? 429
              : 400;
    send(res, status, {
      error: err.error || "error",
      message: err.reason || err.message || "Request failed",
    });
    return true;
  }
}

WebApp.connectHandlers.use(
  cors({
    origin(origin, cb) {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) {
        cb(null, true);
      } else {
        cb(new Error(`CORS blocked for ${origin}`));
      }
    },
    credentials: true,
  }),
);
// Capture raw body for PayMongo signature verification (P1-03).
WebApp.connectHandlers.use(
  bodyParser.json({
    limit: "1mb",
    verify: (req, _res, buf) => {
      (req as IncomingMessage & { rawBody?: string }).rawBody = buf.toString("utf8");
    },
  }),
);
WebApp.connectHandlers.use(async (req, res, next) => {
  const handled = await handler(req as Req, res as Res);
  if (!handled) next();
});

logInfo("rest.router.mounted", { origins: ALLOWED_ORIGINS });
