import { FeatureFlags } from "../collections";
import { logDebug, logInfo, logWarn } from "./logger";

/** Keys safe to expose without auth (marketing + payment mode). */
export const PUBLIC_FEATURE_FLAG_KEYS = [
  "show_pricing",
  "show_testimonials",
  "show_compete",
  "show_coaching",
  "payments_stub",
] as const;

export type PublicFeatureFlagKey = (typeof PUBLIC_FEATURE_FLAG_KEYS)[number];

/** Defaults keep current pilot behavior if a flag row is missing. */
export const PUBLIC_FEATURE_FLAG_DEFAULTS: Record<PublicFeatureFlagKey, boolean> = {
  show_pricing: true,
  show_testimonials: true,
  show_compete: false,
  show_coaching: false,
  payments_stub: true,
};

export async function isFeatureEnabled(
  key: string,
  fallback = false,
): Promise<boolean> {
  try {
    const row = await FeatureFlags.findOneAsync({ key });
    if (!row) {
      logDebug("featureFlags.missing", { key, fallback });
      return fallback;
    }
    logDebug("featureFlags.read", { key, enabled: row.enabled });
    return Boolean(row.enabled);
  } catch (error) {
    logWarn("featureFlags.read_fail", {
      key,
      fallback,
      message: error instanceof Error ? error.message : String(error),
    });
    return fallback;
  }
}

export async function getPublicFeatureFlags(): Promise<Record<PublicFeatureFlagKey, boolean>> {
  const out = { ...PUBLIC_FEATURE_FLAG_DEFAULTS };
  try {
    const rows = await FeatureFlags.find({
      key: { $in: [...PUBLIC_FEATURE_FLAG_KEYS] },
    }).fetchAsync();
    for (const row of rows) {
      if ((PUBLIC_FEATURE_FLAG_KEYS as readonly string[]).includes(row.key)) {
        out[row.key as PublicFeatureFlagKey] = Boolean(row.enabled);
      }
    }
    logInfo("featureFlags.public.ok", { flags: out, fromDb: rows.length });
  } catch (error) {
    logWarn("featureFlags.public.fail", {
      message: error instanceof Error ? error.message : String(error),
      usingDefaults: true,
    });
  }
  return out;
}
