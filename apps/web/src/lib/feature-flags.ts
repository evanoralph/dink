import { apiFetch } from "./api";
import { logDebug, logInfo, logWarn } from "./logger";

export type PublicFeatureFlags = {
  show_pricing: boolean;
  show_testimonials: boolean;
  show_compete: boolean;
  show_coaching: boolean;
  payments_stub: boolean;
};

/** Safe defaults if API is down — honesty-first for unshipped marketing. */
export const PUBLIC_FEATURE_FLAG_DEFAULTS: PublicFeatureFlags = {
  show_pricing: true,
  show_testimonials: true,
  show_compete: false,
  show_coaching: false,
  payments_stub: true,
};

export async function getPublicFeatureFlags(): Promise<PublicFeatureFlags> {
  try {
    const flags = await apiFetch<PublicFeatureFlags>("/api/v1/feature-flags");
    const merged: PublicFeatureFlags = {
      ...PUBLIC_FEATURE_FLAG_DEFAULTS,
      ...flags,
    };
    logInfo("featureFlags.web.ok", { flags: merged });
    return merged;
  } catch (error) {
    logWarn("featureFlags.web.fail", {
      message: error instanceof Error ? error.message : String(error),
      usingDefaults: true,
    });
    logDebug("featureFlags.web.defaults", PUBLIC_FEATURE_FLAG_DEFAULTS);
    return { ...PUBLIC_FEATURE_FLAG_DEFAULTS };
  }
}
