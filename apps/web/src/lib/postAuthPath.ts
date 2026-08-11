import type { PublicUser } from "./types";

/** Destination after login/signup or when an existing session hits /login|/signup. */
export function getPostAuthPath(user: PublicUser): string {
  const roles = Array.isArray(user.roles) ? user.roles : [];
  if (!user.profile?.onboardingComplete) {
    return "/onboarding";
  }
  if (roles.includes("admin")) {
    return "/admin";
  }
  if (roles.some((r) => r === "venue_owner" || r === "venue_staff")) {
    return "/venue";
  }
  return "/play";
}
