import { Accounts } from "meteor/accounts-base";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import { Random } from "meteor/random";
import { createHash } from "crypto";
import { getUserRoles, publicUser, requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo, logWarn } from "../../lib/logger";
import { parseBody } from "../../lib/validate";
import {
  forgotPasswordSchema,
  loginSchema,
  profileUpdateSchema,
  resetPasswordSchema,
  signupSchema,
} from "../../lib/zodSchemas";
import { Email } from "meteor/email";
import { track } from "../../lib/analytics";
import { notifyUser } from "../notifications/service";

function hashResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

Meteor.methods({
  async "auth.signup"(input: unknown) {
    return withMethodLog("auth.signup", null, async () => {
      const body = parseBody(signupSchema, input, "signup");

      const existing = await Accounts.findUserByEmail(body.email);
      if (existing) {
        throw new Meteor.Error("email-exists", "Email already registered");
      }

      const inviteCode = Random.id(6).toUpperCase();
      let invitedBy: string | undefined;
      const rawInvite = body.inviteCode?.trim().toUpperCase();
      if (rawInvite) {
        const inviter = await Meteor.users.findOneAsync({ "profile.inviteCode": rawInvite });
        if (inviter?._id) invitedBy = inviter._id;
      }

      const userId = await Accounts.createUserAsync({
        email: body.email,
        password: body.password,
        profile: {
          displayName: body.displayName,
          onboardingComplete: false,
          inviteCode,
          inviteCount: 0,
          invitedBy,
        },
      });

      await Roles.createRoleAsync("player", { unlessExists: true });
      await Roles.addUsersToRolesAsync(userId, "player");

      if (invitedBy) {
        await Meteor.users.updateAsync(invitedBy, { $inc: { "profile.inviteCount": 1 } });
        await notifyUser({
          userId: invitedBy,
          type: "invite.accepted",
          title: "Your invite was used",
          body: `${body.displayName} signed up with your invite link.`,
          entityType: "user",
          entityId: userId,
        });
        track("invite_accepted", { inviterUserId: invitedBy, userId });
        logInfo("auth.signup.invite", { userId, invitedBy, code: rawInvite });
      }

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

  async "auth.login"(input: unknown) {
    return withMethodLog("auth.login", null, async () => {
      const body = parseBody(loginSchema, input, "login");
      const user = await Accounts.findUserByEmail(body.email);
      if (!user || user.profile?.deletedAt) {
        throw new Meteor.Error("invalid-credentials", "Invalid email or password");
      }
      if (user.profile?.suspended) {
        throw new Meteor.Error("suspended", "This account is suspended");
      }

      const result = await Accounts._checkPasswordAsync(user, body.password);
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

  async "auth.logout"(token?: string) {
    return withMethodLog("auth.logout", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      if (token && typeof token === "string") {
        const hashed = Accounts._hashLoginToken(token);
        await Meteor.users.updateAsync(userId, {
          $pull: { "services.resume.loginTokens": { hashedToken: hashed } },
        });
        logInfo("auth.logout.revoke_token", { userId });
      } else {
        await Meteor.users.updateAsync(userId, {
          $set: { "services.resume.loginTokens": [] },
        });
        logInfo("auth.logout.revoke_all", { userId });
      }
      return { ok: true };
    });
  },

  /** Always returns ok to avoid email enumeration (P1-17). */
  async "auth.forgotPassword"(input: unknown) {
    return withMethodLog("auth.forgotPassword", null, async () => {
      const body = parseBody(forgotPasswordSchema, input, "forgotPassword");
      const user = await Accounts.findUserByEmail(body.email);
      if (!user?._id) {
        logInfo("auth.forgotPassword.unknown_email");
        return { ok: true };
      }

      const token = Random.secret();
      const hashed = hashResetToken(token);
      const when = new Date();
      await Meteor.users.updateAsync(user._id, {
        $set: {
          "services.dinkReset": {
            hashedToken: hashed,
            email: body.email.toLowerCase(),
            when,
          },
        },
      });

      const appUrl = process.env.APP_URL || process.env.ROOT_WEB_URL || "http://localhost:3000";
      const link = `${appUrl}/reset-password?token=${encodeURIComponent(token)}&email=${encodeURIComponent(body.email)}`;
      const mailUrl = process.env.MAIL_URL;
      const from = process.env.MAIL_FROM || "Dink <noreply@dink.local>";

      if (mailUrl) {
        try {
          await Email.sendAsync({
            from,
            to: body.email,
            subject: "Reset your Dink password",
            text: `Reset your password:\n\n${link}\n\nThis link expires in 1 hour.`,
          });
          logInfo("auth.forgotPassword.email_sent", { userId: user._id });
        } catch (error) {
          logWarn("auth.forgotPassword.email_fail", {
            message: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        // Dev convenience — never log full token in production.
        logInfo("auth.forgotPassword.dev_link", {
          userId: user._id,
          link: process.env.NODE_ENV === "production" ? "[redacted]" : link,
        });
      }

      return { ok: true };
    });
  },

  async "auth.resetPassword"(input: unknown) {
    return withMethodLog("auth.resetPassword", null, async () => {
      const body = parseBody(resetPasswordSchema, input, "resetPassword");
      const hashed = hashResetToken(body.token);
      const user = await Meteor.users.findOneAsync({
        "services.dinkReset.hashedToken": hashed,
        "services.dinkReset.email": body.email.toLowerCase(),
      });
      if (!user?._id) {
        throw new Meteor.Error("invalid-token", "Reset link is invalid or expired");
      }

      const reset = (user.services as { dinkReset?: { when?: Date } } | undefined)?.dinkReset;
      const when = reset?.when;
      if (!when || Date.now() - new Date(when).getTime() > 60 * 60 * 1000) {
        throw new Meteor.Error("invalid-token", "Reset link is invalid or expired");
      }

      await Accounts.setPasswordAsync(user._id, body.password, { logout: true });
      await Meteor.users.updateAsync(user._id, {
        $unset: { "services.dinkReset": 1 },
        $set: { "services.resume.loginTokens": [] },
      });
      logInfo("auth.resetPassword.ok", { userId: user._id });
      return { ok: true };
    });
  },

  async "me.get"() {
    return withMethodLog("me.get", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const user = await Meteor.users.findOneAsync(userId);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      if (!user.profile?.inviteCode) {
        const code = Random.id(6).toUpperCase();
        await Meteor.users.updateAsync(userId, {
          $set: {
            "profile.inviteCode": code,
            "profile.inviteCount": user.profile?.inviteCount || 0,
          },
        });
        user.profile = { ...user.profile, inviteCode: code, inviteCount: user.profile?.inviteCount || 0 };
        logInfo("me.get.invite_code_issued", { userId, code });
      }
      const roles = await getUserRoles(userId);
      return publicUser(user, roles);
    });
  },

  async "me.updateProfile"(input: unknown) {
    return withMethodLog("me.updateProfile", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(profileUpdateSchema, input, "profile");

      const $set: Record<string, unknown> = {};
      if (body.displayName !== undefined) $set["profile.displayName"] = body.displayName;
      if (body.city !== undefined) $set["profile.city"] = body.city;
      if (body.skillLevel !== undefined) $set["profile.skillLevel"] = body.skillLevel;
      if (body.onboardingComplete !== undefined) {
        $set["profile.onboardingComplete"] = body.onboardingComplete;
      }

      await Meteor.users.updateAsync(userId, { $set });
      const user = await Meteor.users.findOneAsync(userId);
      const roles = await getUserRoles(userId);
      return publicUser(user!, roles);
    });
  },

  /** P2-06: downloadable account snapshot (no secrets). */
  async "me.export"() {
    return withMethodLog("me.export", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const user = await Meteor.users.findOneAsync(userId);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      const roles = await getUserRoles(userId);
      const {
        BookingParticipants,
        Bookings,
        Games,
        GamePlayers,
        Matches,
        Notifications,
        Payments,
        VenueReviews,
      } = await import("../../collections");

      const parts = await BookingParticipants.find({ userId }).fetchAsync();
      const bookingIds = parts.map((p) => p.bookingId);
      const [bookings, payments, gamePlayers, reviews, notifications] = await Promise.all([
        bookingIds.length
          ? Bookings.find({ _id: { $in: bookingIds } }).fetchAsync()
          : Promise.resolve([]),
        Payments.find({ userId }, { fields: { metadata: 0, webhookEventIds: 0 } }).fetchAsync(),
        GamePlayers.find({ userId }).fetchAsync(),
        VenueReviews.find({ userId }).fetchAsync(),
        Notifications.find({ userId }, { sort: { createdAt: -1 }, limit: 100 }).fetchAsync(),
      ]);
      const gameIds = gamePlayers.map((g) => g.gameId);
      const games = gameIds.length
        ? await Games.find({ _id: { $in: gameIds } }).fetchAsync()
        : [];
      const matches = await Matches.find({
        $or: [{ team1UserIds: userId }, { team2UserIds: userId }],
      }).fetchAsync();

      logInfo("me.export.ok", {
        userId,
        bookings: bookings.length,
        games: games.length,
      });
      return {
        exportedAt: new Date().toISOString(),
        user: publicUser(user, roles),
        bookings,
        payments,
        games,
        gamePlayers,
        matches,
        reviews,
        notifications,
      };
    });
  },

  async "me.delete"(input: unknown) {
    return withMethodLog("me.delete", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(loginSchema.pick({ password: true }), input, "deleteAccount");
      const user = await Meteor.users.findOneAsync(userId);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      const checkPw = await Accounts._checkPasswordAsync(user, body.password);
      if (checkPw.error) {
        throw new Meteor.Error("invalid-credentials", "Password incorrect");
      }

      const {
        BookingParticipants,
        Bookings,
        GamePlayers,
        Games,
      } = await import("../../collections");

      const future = await Bookings.find({
        creatorUserId: userId,
        status: { $in: ["pending_payment", "confirmed"] },
        startsAt: { $gte: new Date() },
      }).fetchAsync();
      for (const b of future) {
        await Bookings.updateAsync(b._id!, {
          $set: { status: "cancelled", updatedAt: new Date() },
        });
      }

      const myGames = await GamePlayers.find({ userId, status: "joined" }).fetchAsync();
      for (const gp of myGames) {
        const game = await Games.findOneAsync(gp.gameId);
        await GamePlayers.updateAsync(gp._id!, { $set: { status: "left" } });
        if (game && ["open", "full"].includes(game.status)) {
          const playerCount = Math.max(0, game.playerCount - 1);
          await Games.updateAsync(gp.gameId, {
            $set: { playerCount, status: playerCount >= game.capacity ? "full" : "open" },
          });
        }
      }

      await Meteor.users.updateAsync(userId, {
        $set: {
          "profile.displayName": "Deleted user",
          "profile.deletedAt": new Date(),
          "profile.suspended": false,
          "services.resume.loginTokens": [],
          emails: [],
        },
      });
      logInfo("me.delete.ok", { userId, cancelledBookings: future.length });
      return { ok: true };
    });
  },
});
