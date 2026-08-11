import { apiFetch } from "./api-server";
import type { PublicUser } from "./types";
import { logDebug, logInfo } from "./logger";
import { getPostAuthPath } from "./postAuthPath";

export { getPostAuthPath };

function normalizeUser(user: PublicUser): PublicUser {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (!Array.isArray(user.roles)) {
    logInfo("auth.me.roles_missing", { userId: user._id });
  }
  return {
    ...user,
    profile: {
      displayName: user.profile?.displayName || "Player",
      city: user.profile?.city,
      skillLevel: user.profile?.skillLevel,
      onboardingComplete: Boolean(user.profile?.onboardingComplete),
    },
    roles,
  };
}

export async function getCurrentUser(): Promise<PublicUser | null> {
  try {
    const user = await apiFetch<PublicUser>("/api/v1/me");
    if (!user?._id) {
      logInfo("auth.me.invalid", { hasUser: Boolean(user) });
      return null;
    }
    const normalized = normalizeUser(user);
    logDebug("auth.me", { userId: normalized._id, roles: normalized.roles });
    return normalized;
  } catch {
    return null;
  }
}

export function hasRole(user: PublicUser | null, roles: string[]) {
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [];
  return userRoles.some((r) => roles.includes(r));
}
