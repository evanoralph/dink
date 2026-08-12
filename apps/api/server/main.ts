import { Meteor } from "meteor/meteor";
import { WebApp } from "meteor/webapp";
import "../imports/api/rest/router";
import "../imports/modules/accounts/methods";
import "../imports/modules/venues/methods";
import "../imports/modules/venues/rules";
import "../imports/modules/venues/reviews";
import "../imports/modules/bookings/methods";
import "../imports/modules/games/methods";
import "../imports/modules/matches/methods";
import "../imports/modules/payments/methods";
import "../imports/modules/notifications/methods";
import "../imports/modules/featureFlags/methods";
import "../imports/modules/admin/methods";
import "../imports/modules/reports/methods";
import "../imports/modules/groups/methods";
import "../imports/modules/chat/methods";
import "../imports/modules/friends/methods";
import "../imports/modules/coaches/methods";
import "../imports/modules/ratings/methods";
import "../imports/modules/leagues/methods";
import "../imports/modules/ladders/methods";
import "../imports/modules/tournaments/methods";
import "../imports/modules/packs/methods";
import "../imports/modules/disputes/methods";
import "../imports/modules/games/publications";
import "../imports/modules/venues/publications";
import { decideSeedOnStartup, isProdLikeRuntime } from "../imports/lib/seedPolicy";
import { assertProdSecretsOrThrow } from "../imports/lib/prodSecrets";
import { ensureIndexes } from "../imports/startup/indexes";
import { seedIfNeeded } from "../imports/startup/seed";
import { startJobs } from "../imports/startup/jobs";
import { logInfo } from "../imports/lib/logger";
import { logMetricSnapshot } from "../imports/lib/metrics";

Meteor.startup(async () => {
  // P1-21: fail fast before indexes/seed if prod secrets are weak.
  assertProdSecretsOrThrow();

  const corsOrigins = (
    process.env.CORS_ORIGINS ||
    "http://localhost:3000,http://127.0.0.1:3000"
  )
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const seedDecision = decideSeedOnStartup();

  // P0-05/P0-07: log env contract (no secrets) so deploy mismatches are obvious.
  logInfo("api.startup", {
    rootUrl: process.env.ROOT_URL || Meteor.absoluteUrl(),
    corsOrigins,
    debug: process.env.DEBUG === "1",
    prodLike: isProdLikeRuntime(),
    seedWillRun: seedDecision.run,
    seedReason: seedDecision.reason,
    paymentProvider: process.env.PAYMENT_PROVIDER || "stub",
    paymongoConfigured: Boolean(process.env.PAYMONGO_SECRET_KEY),
    sentryConfigured: Boolean(process.env.SENTRY_DSN),
    alertWebhookConfigured: Boolean(process.env.ALERT_WEBHOOK_URL),
    note: "AUTH_COOKIE_SECRET and NEXT_PUBLIC_METEOR_DDP_URL are intentionally unused (P0-06)",
  });

  // Headless API — no client UI needed
  WebApp.connectHandlers.use("/", (_req, res, next) => {
    if (_req.url === "/" || _req.url === "") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, service: "dink-api", docs: "/api/v1/health" }));
      return;
    }
    next();
  });

  await ensureIndexes();
  await seedIfNeeded();
  startJobs();
  logMetricSnapshot("api.metrics.boot");
  logInfo("api.ready", { port: process.env.PORT || 3001, corsOriginsCount: corsOrigins.length });
});
