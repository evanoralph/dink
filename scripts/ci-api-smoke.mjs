/**
 * P0-08: lightweight API smoke without installing Meteor.
 * Verifies critical files + seed policy behavior (keep in sync with
 * apps/api/imports/lib/seedPolicy.ts).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function log(event, fields = {}) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", event, ...fields }));
}

function fail(message, fields = {}) {
  console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", event: "ci.api.smoke.fail", message, ...fields }));
  process.exit(1);
}

const requiredFiles = [
  "apps/api/server/main.ts",
  "apps/api/imports/startup/seed.ts",
  "apps/api/imports/lib/seedPolicy.ts",
  "apps/api/imports/api/rest/router.ts",
  "apps/api/imports/modules/featureFlags/methods.ts",
  "apps/api/imports/modules/payments/providers/paymongo.ts",
  "apps/api/imports/modules/payments/providers/index.ts",
  "apps/api/imports/modules/payments/webhookSecurity.ts",
  "apps/api/imports/modules/payments/providers/refunds.ts",
  "apps/api/imports/modules/notifications/service.ts",
  "apps/api/imports/modules/notifications/methods.ts",
  "apps/api/imports/lib/cancelPolicy.ts",
  "apps/api/imports/modules/venues/rules.ts",
  "apps/api/imports/lib/prodSecrets.ts",
  "apps/api/imports/lib/rateLimit.ts",
  "apps/api/imports/lib/sentry.ts",
  "apps/api/imports/lib/metrics.ts",
  "apps/api/imports/lib/alerts.ts",
  "apps/api/imports/lib/splitPay.ts",
  "apps/api/imports/lib/reliability.ts",
  "apps/api/imports/modules/reports/methods.ts",
  "apps/api/imports/lib/analytics.ts",
  "apps/api/imports/startup/indexes.ts",
  "apps/api/imports/startup/jobs.ts",
  "apps/web/src/app/list-your-venue/page.tsx",
  "apps/web/src/components/venue/VenueOnboardWizard.tsx",
  "docs/SUPPORT_PLAYBOOK.md",
  "scripts/load-test-bookings.mjs",
  "apps/api/imports/modules/groups/methods.ts",
  "apps/api/imports/modules/chat/methods.ts",
  "apps/api/imports/modules/friends/methods.ts",
  "apps/api/imports/modules/coaches/methods.ts",
  "apps/web/src/app/groups/page.tsx",
  "apps/web/src/app/coaches/page.tsx",
  "apps/web/src/app/friends/page.tsx",
  "apps/web/src/app/matches/[id]/share/page.tsx",
  "apps/api/imports/modules/ratings/methods.ts",
  "apps/api/imports/modules/leagues/methods.ts",
  "apps/api/imports/modules/ladders/methods.ts",
  "apps/api/imports/modules/tournaments/methods.ts",
  "apps/api/imports/modules/packs/methods.ts",
  "apps/api/imports/modules/disputes/methods.ts",
  "apps/web/src/app/compete/page.tsx",
  "apps/web/src/app/venue/packs/page.tsx",
  "apps/web/src/app/admin/disputes/page.tsx",
  "docs/DUPR_SPIKE.md",
  "apps/api/tsconfig.json",
];

for (const rel of requiredFiles) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) fail("missing_file", { rel });
}

const seedPolicySrc = fs.readFileSync(path.join(root, "apps/api/imports/lib/seedPolicy.ts"), "utf8");
for (const needle of [
  "prod_default_off",
  "default_seed_passwords_in_prod",
  "decideSeedOnStartup",
  "assertSeedPasswordsSafe",
]) {
  if (!seedPolicySrc.includes(needle)) fail("seed_policy_missing_marker", { needle });
}

const seedSrc = fs.readFileSync(path.join(root, "apps/api/imports/startup/seed.ts"), "utf8");
if (!seedSrc.includes("decideSeedOnStartup") || !seedSrc.includes("assertSeedPasswordsSafe")) {
  fail("seed_ts_not_using_policy");
}

// --- Behavior mirror of seedPolicy.ts (P0-07) ---
const DEFAULT_SEED_PASSWORDS = ["Admin123!", "Owner123!", "Player123!"];

function isProdLikeRuntime(env) {
  const nodeEnv = env.NODE_ENV || "";
  const rootUrl = env.ROOT_URL || "";
  return nodeEnv === "production" || /^https:\/\//i.test(rootUrl);
}

function decideSeedOnStartup(env) {
  const flag = env.SEED_ON_STARTUP;
  const prod = isProdLikeRuntime(env);
  if (flag === "false") return { run: false, reason: "explicit_false" };
  if (prod && flag !== "true") return { run: false, reason: "prod_default_off" };
  if (prod && flag === "true") {
    return { run: true, reason: "explicit_true", requireCustomPasswords: true };
  }
  return {
    run: true,
    reason: flag === "true" ? "explicit_true" : "dev_default_on",
    requireCustomPasswords: false,
  };
}

function assertSeedPasswordsSafe(passwords, requireCustomPasswords) {
  if (!requireCustomPasswords) return { ok: true };
  const defaults = new Set(DEFAULT_SEED_PASSWORDS);
  if (passwords.some((p) => defaults.has(p))) {
    return { ok: false, reason: "default_seed_passwords_in_prod" };
  }
  return { ok: true };
}

function assertEqual(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    fail("assertion_failed", { label, actual, expected });
  }
}

assertEqual(
  decideSeedOnStartup({ NODE_ENV: "development" }),
  { run: true, reason: "dev_default_on", requireCustomPasswords: false },
  "dev_default_on",
);

assertEqual(
  decideSeedOnStartup({ NODE_ENV: "production" }),
  { run: false, reason: "prod_default_off" },
  "prod_default_off",
);

assertEqual(
  decideSeedOnStartup({ ROOT_URL: "https://api.example.com", SEED_ON_STARTUP: "true" }),
  { run: true, reason: "explicit_true", requireCustomPasswords: true },
  "https_explicit_true",
);

assertEqual(
  decideSeedOnStartup({ NODE_ENV: "production", SEED_ON_STARTUP: "false" }),
  { run: false, reason: "explicit_false" },
  "prod_explicit_false",
);

assertEqual(
  assertSeedPasswordsSafe(["Admin123!", "x", "y"], true),
  { ok: false, reason: "default_seed_passwords_in_prod" },
  "block_default_passwords",
);

assertEqual(
  assertSeedPasswordsSafe(["Rot1!", "Rot2!", "Rot3!"], true),
  { ok: true },
  "allow_custom_passwords",
);

const indexesSrc = fs.readFileSync(path.join(root, "apps/api/imports/startup/indexes.ts"), "utf8");
if (!indexesSrc.includes("bookings_active_slot") || !indexesSrc.includes("pending_payment")) {
  fail("missing_active_slot_index");
}

const jobsSrc = fs.readFileSync(path.join(root, "apps/api/imports/startup/jobs.ts"), "utf8");
if (!jobsSrc.includes("jobs.remindBooking") || !jobsSrc.includes("TWILIO_ACCOUNT_SID")) {
  fail("missing_reminder_job");
}

const venuesSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/venues/methods.ts"), "utf8");
if (!venuesSrc.includes("venues.applyOnboardDefaults") || !venuesSrc.includes("venue_owner")) {
  fail("missing_venue_onboard_wizard_api");
}

if (!seedSrc.includes("The Pickle Yard Clark") || !seedSrc.includes("Ortigas Rec Courts")) {
  fail("missing_pilot_seed_venues");
}

const groupsSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/groups/methods.ts"), "utf8");
if (!groupsSrc.includes("groups.create") || !groupsSrc.includes("groups.join")) {
  fail("missing_groups_methods");
}

const coachesSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/coaches/methods.ts"), "utf8");
if (!coachesSrc.includes("coaches.request") || !coachesSrc.includes("coaches.review")) {
  fail("missing_coaches_methods");
}

const gamesSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/games/methods.ts"), "utf8");
if (!gamesSrc.includes("waitlist") || !gamesSrc.includes("games.repeatWeekly")) {
  fail("missing_open_play_waitlist");
}

const ratingsSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/ratings/methods.ts"), "utf8");
if (!ratingsSrc.includes("ratings.history") || !ratingsSrc.includes("ratings.leaderboard")) {
  fail("missing_ratings_methods");
}

const leaguesSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/leagues/methods.ts"), "utf8");
if (!leaguesSrc.includes("leagues.create") || !leaguesSrc.includes("leagues.recordResult")) {
  fail("missing_leagues_methods");
}

const tournamentsSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/tournaments/methods.ts"), "utf8");
if (!tournamentsSrc.includes("tournaments.register") || !tournamentsSrc.includes("tournaments.reportWinner")) {
  fail("missing_tournaments_methods");
}

const packsSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/packs/methods.ts"), "utf8");
if (!packsSrc.includes("packs.buy") || !packsSrc.includes("packs.create")) {
  fail("missing_packs_methods");
}

const disputesSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/disputes/methods.ts"), "utf8");
if (!disputesSrc.includes("matches.dispute") || !disputesSrc.includes("admin.disputes.resolve")) {
  fail("missing_disputes_methods");
}

if (!seedSrc.includes("show_compete") || !seedSrc.includes("Weeknight Pass")) {
  fail("missing_compete_seed");
}

const venuesReportsSrc = fs.readFileSync(path.join(root, "apps/api/imports/modules/venues/methods.ts"), "utf8");
if (!venuesReportsSrc.includes("venue.reports.export") || !venuesReportsSrc.includes("utilizationPct")) {
  fail("missing_venue_report_export");
}

log("ci.api.smoke.ok", {
  filesChecked: requiredFiles.length,
  policyAssertions: 6,
  phase2Markers: ["bookings_active_slot", "remindBooking", "applyOnboardDefaults", "pilot_seed"],
  phase3Markers: ["groups.create", "coaches.request", "waitlist", "repeatWeekly"],
  phase4Markers: ["ratings.history", "leagues.create", "tournaments.register", "packs.buy", "matches.dispute", "venue.reports.export"],
});
