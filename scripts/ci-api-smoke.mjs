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

log("ci.api.smoke.ok", {
  filesChecked: requiredFiles.length,
  policyAssertions: 6,
});
