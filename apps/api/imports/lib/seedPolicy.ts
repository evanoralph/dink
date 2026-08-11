import { logDebug, logError, logInfo, logWarn } from "./logger";

/** Well-known local demo passwords — never allow these when seeding prod-like envs. */
export const DEFAULT_SEED_PASSWORDS = ["Admin123!", "Owner123!", "Player123!"] as const;

export type SeedDecision =
  | { run: false; reason: "explicit_false" | "prod_default_off" }
  | { run: true; reason: "explicit_true" | "dev_default_on"; requireCustomPasswords: boolean };

export function isProdLikeRuntime(env: NodeJS.ProcessEnv = process.env): boolean {
  const nodeEnv = env.NODE_ENV || "";
  const rootUrl = env.ROOT_URL || "";
  return nodeEnv === "production" || /^https:\/\//i.test(rootUrl);
}

/**
 * P0-07 policy:
 * - SEED_ON_STARTUP=false → never seed
 * - prod-like + unset → skip (default off)
 * - prod-like + true → seed only with non-default passwords
 * - non-prod + unset/true → seed (local demo)
 */
export function decideSeedOnStartup(env: NodeJS.ProcessEnv = process.env): SeedDecision {
  const flag = env.SEED_ON_STARTUP;
  const prod = isProdLikeRuntime(env);

  if (flag === "false") {
    return { run: false, reason: "explicit_false" };
  }
  if (prod && flag !== "true") {
    return { run: false, reason: "prod_default_off" };
  }
  if (prod && flag === "true") {
    return { run: true, reason: "explicit_true", requireCustomPasswords: true };
  }
  return {
    run: true,
    reason: flag === "true" ? "explicit_true" : "dev_default_on",
    requireCustomPasswords: false,
  };
}

export function assertSeedPasswordsSafe(
  passwords: string[],
  requireCustomPasswords: boolean,
): { ok: true } | { ok: false; reason: string } {
  if (!requireCustomPasswords) return { ok: true };
  const defaults = new Set<string>(DEFAULT_SEED_PASSWORDS);
  const usesDefault = passwords.some((p) => defaults.has(p));
  if (usesDefault) {
    return {
      ok: false,
      reason: "default_seed_passwords_in_prod",
    };
  }
  return { ok: true };
}

export function logSeedDecision(decision: SeedDecision) {
  if (!decision.run) {
    logInfo("seed.skipped", { reason: decision.reason, prod: isProdLikeRuntime() });
    logDebug("seed.policy", { decision });
    return;
  }
  if (decision.requireCustomPasswords) {
    logWarn("seed.prod_explicit", {
      reason: decision.reason,
      note: "Seeding prod-like env — use rotated SEED_*_PASSWORD values, then set SEED_ON_STARTUP=false",
    });
  } else {
    logInfo("seed.starting", { reason: decision.reason });
  }
}

export function blockUnsafeProdSeed(reason: string): never {
  logError("seed.blocked", { reason });
  throw new Error(
    `Refusing to seed: ${reason}. Set unique SEED_*_PASSWORD values or SEED_ON_STARTUP=false.`,
  );
}
