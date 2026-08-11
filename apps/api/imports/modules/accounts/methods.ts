import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import { check, Match } from "meteor/check";
import { getUserRoles, publicUser, requireUserId } from "../../lib/auth";
import { withMethodLog } from "../../lib/logger";

Meteor.methods({
  async "auth.signup"(input: { email: string; password: string; displayName: string }) {
    return withMethodLog("auth.signup", null, async () => {
      check(input, {
        email: String,
        password: String,
        displayName: String,
      });

      const existing = await Accounts.findUserByEmail(input.email);
      if (existing) {
        throw new Meteor.Error("email-exists", "Email already registered");
      }

      const userId = await Accounts.createUserAsync({
        email: input.email,
        password: input.password,
        profile: {
          displayName: input.displayName,
          onboardingComplete: false,
        },
      });

      await Roles.createRoleAsync("player", { unlessExists: true });
      await Roles.addUsersToRolesAsync(userId, "player");

      const stamped = Accounts._generateStampedLoginToken();
      await Accounts._insertLoginToken(userId, stamped);
      const user = await Meteor.users.findOneAsync(userId);
      const roles = await getUserRoles(userId);

      return {
        loginToken: stamped.token,
        user: publicUser(user!, roles),
      };
    });
  },

  async "auth.login"(input: { email: string; password: string }) {
    return withMethodLog("auth.login", null, async () => {
      check(input, { email: String, password: String });
      const user = await Accounts.findUserByEmail(input.email);
      if (!user) {
        throw new Meteor.Error("invalid-credentials", "Invalid email or password");
      }

      const result = await Accounts._checkPasswordAsync(user, input.password);
      if (result.error) {
        throw new Meteor.Error("invalid-credentials", "Invalid email or password");
      }

      const stamped = Accounts._generateStampedLoginToken();
      await Accounts._insertLoginToken(user._id!, stamped);
      const roles = await getUserRoles(user._id!);
      return {
        loginToken: stamped.token,
        user: publicUser(user, roles),
      };
    });
  },

  async "auth.logout"() {
    return withMethodLog("auth.logout", this.userId, async () => {
      // Token removal handled by Next clearing cookie; server-side logout is best-effort.
      return { ok: true };
    });
  },

  async "me.get"() {
    return withMethodLog("me.get", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const user = await Meteor.users.findOneAsync(userId);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      const roles = await getUserRoles(userId);
      return publicUser(user, roles);
    });
  },

  async "me.updateProfile"(input: {
    displayName?: string;
    city?: string;
    skillLevel?: number;
    onboardingComplete?: boolean;
  }) {
    return withMethodLog("me.updateProfile", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        displayName: Match.Optional(String),
        city: Match.Optional(String),
        skillLevel: Match.Optional(Number),
        onboardingComplete: Match.Optional(Boolean),
      });

      const $set: Record<string, unknown> = {};
      if (input.displayName !== undefined) $set["profile.displayName"] = input.displayName;
      if (input.city !== undefined) $set["profile.city"] = input.city;
      if (input.skillLevel !== undefined) $set["profile.skillLevel"] = input.skillLevel;
      if (input.onboardingComplete !== undefined) {
        $set["profile.onboardingComplete"] = input.onboardingComplete;
      }

      await Meteor.users.updateAsync(userId, { $set });
      const user = await Meteor.users.findOneAsync(userId);
      const roles = await getUserRoles(userId);
      return publicUser(user!, roles);
    });
  },
});
