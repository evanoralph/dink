import { Meteor } from "meteor/meteor";
import { Accounts } from "meteor/accounts-base";
import { Roles } from "meteor/alanning:roles";
import type { Role } from "./roles";
import { logDebug } from "./logger";
import { getRequestUserId } from "./requestContext";

export async function requireUserId(userId: string | null | undefined): Promise<string> {
  const resolved = getRequestUserId(userId ?? null);
  if (!resolved) {
    throw new Meteor.Error("not-authorized", "Login required");
  }
  return resolved;
}

export async function userHasRole(userId: string, role: Role | Role[]): Promise<boolean> {
  const roles = Array.isArray(role) ? role : [role];
  for (const r of roles) {
    if (await Roles.userIsInRoleAsync(userId, r)) return true;
  }
  return false;
}

export async function requireRole(userId: string | null | undefined, role: Role | Role[]) {
  const uid = await requireUserId(userId);
  const ok = await userHasRole(uid, role);
  if (!ok) {
    throw new Meteor.Error("forbidden", "Insufficient role");
  }
  return uid;
}

export async function getUserRoles(userId: string): Promise<Role[]> {
  const roles = (await Roles.getRolesForUserAsync(userId)) as Role[] | null | undefined;
  if (!Array.isArray(roles)) {
    logDebug("auth.roles.empty", { userId, rolesType: typeof roles });
    return [];
  }
  return roles;
}

export function findUserByLoginToken(token: string) {
  const hashed = Accounts._hashLoginToken(token);
  return Meteor.users.findOneAsync({
    "services.resume.loginTokens.hashedToken": hashed,
  });
}

export async function resolveUserFromRequest(req: {
  headers: Record<string, string | string[] | undefined>;
}) {
  const auth = req.headers.authorization || req.headers.Authorization;
  const headerToken = req.headers["x-auth-token"] || req.headers["X-Auth-Token"];
  let token: string | undefined;

  if (typeof auth === "string" && auth.startsWith("Bearer ")) {
    token = auth.slice(7).trim();
  } else if (typeof headerToken === "string") {
    token = headerToken.trim();
  }

  if (!token) return null;
  const user = await findUserByLoginToken(token);
  logDebug("auth.resolve", { found: Boolean(user) });
  return user ? { user, token } : null;
}

export function publicUser(user: Meteor.User, roles: Role[] | null | undefined) {
  return {
    _id: user._id!,
    email: user.emails?.[0]?.address,
    profile: {
      displayName: user.profile?.displayName || "Player",
      city: user.profile?.city,
      skillLevel: user.profile?.skillLevel,
      onboardingComplete: Boolean(user.profile?.onboardingComplete),
    },
    roles: Array.isArray(roles) ? roles : [],
  };
}
