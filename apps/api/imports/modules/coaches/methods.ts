import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import { CoachProfiles, CoachRequests, CoachReviews } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";
import { notifyUser } from "../notifications/service";

Meteor.methods({
  async "coaches.list"(filters?: { city?: string }) {
    return withMethodLog("coaches.list", this.userId, async () => {
      check(filters, Match.Maybe({ city: Match.Maybe(String) }));
      const query: Record<string, unknown> = { active: true };
      if (filters?.city) query.city = filters.city;
      const profiles = await CoachProfiles.find(query, { sort: { ratingAvg: -1, updatedAt: -1 }, limit: 60 }).fetchAsync();
      const names = await displayNames(profiles.map((p) => p.userId));
      logInfo("coaches.list.ok", { count: profiles.length, city: filters?.city });
      return profiles.map((p) => ({
        ...p,
        displayName: names.get(p.userId) || "Coach",
      }));
    });
  },

  async "coaches.upsertProfile"(input: { city: string; bio?: string; hourlyRate: number }) {
    return withMethodLog("coaches.upsertProfile", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        city: String,
        bio: Match.Optional(String),
        hourlyRate: Number,
      });
      const city = input.city.trim();
      const hourlyRate = Math.max(0, Math.round(input.hourlyRate));
      if (!city) throw new Meteor.Error("invalid-body", "City required");
      await Roles.createRoleAsync("coach", { unlessExists: true });
      await Roles.addUsersToRolesAsync(userId, "coach");
      const now = new Date();
      const existing = await CoachProfiles.findOneAsync({ userId });
      if (existing?._id) {
        await CoachProfiles.updateAsync(existing._id, {
          $set: { city, bio: input.bio?.trim(), hourlyRate, active: true, updatedAt: now },
        });
        logInfo("coaches.profile.update", { userId, city, hourlyRate });
        return await CoachProfiles.findOneAsync(existing._id);
      }
      const id = await CoachProfiles.insertAsync({
        userId,
        city,
        bio: input.bio?.trim(),
        hourlyRate,
        currency: "PHP",
        active: true,
        ratingAvg: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      logInfo("coaches.profile.create", { userId, city, hourlyRate });
      track("coach_profile_created", { userId, city });
      return await CoachProfiles.findOneAsync(id);
    });
  },

  async "coaches.get"(coachUserId: string) {
    return withMethodLog("coaches.get", this.userId, async () => {
      check(coachUserId, String);
      const profile = await CoachProfiles.findOneAsync({ userId: coachUserId, active: true });
      if (!profile) throw new Meteor.Error("not-found", "Coach not found");
      const names = await displayNames([coachUserId]);
      const reviews = await CoachReviews.find(
        { coachUserId },
        { sort: { createdAt: -1 }, limit: 20 },
      ).fetchAsync();
      const reviewerNames = await displayNames(reviews.map((r) => r.playerUserId));
      let myRequest = null;
      if (this.userId && this.userId === coachUserId) {
        myRequest = await CoachRequests.findOneAsync(
          { coachUserId, status: "pending" },
          { sort: { createdAt: -1 } },
        );
      } else if (this.userId) {
        myRequest = await CoachRequests.findOneAsync(
          { coachUserId, playerUserId: this.userId },
          { sort: { createdAt: -1 } },
        );
      }
      logInfo("coaches.get.ok", { coachUserId, reviews: reviews.length });
      return {
        profile: { ...profile, displayName: names.get(coachUserId) || "Coach" },
        reviews: reviews.map((r) => ({
          ...r,
          displayName: reviewerNames.get(r.playerUserId) || "Player",
        })),
        myRequest,
      };
    });
  },

  async "coaches.request"(input: {
    coachUserId: string;
    venueId?: string;
    startsAt: string;
    note?: string;
  }) {
    return withMethodLog("coaches.request", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        coachUserId: String,
        venueId: Match.Optional(String),
        startsAt: String,
        note: Match.Optional(String),
      });
      if (input.coachUserId === userId) {
        throw new Meteor.Error("invalid-body", "Cannot request yourself");
      }
      const profile = await CoachProfiles.findOneAsync({ userId: input.coachUserId, active: true });
      if (!profile) throw new Meteor.Error("not-found", "Coach not found");
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime()) || startsAt.getTime() < Date.now()) {
        throw new Meteor.Error("invalid-date", "Pick a future time");
      }
      const id = await CoachRequests.insertAsync({
        coachUserId: input.coachUserId,
        playerUserId: userId,
        venueId: input.venueId,
        startsAt,
        note: input.note?.trim(),
        status: "pending",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await notifyUser({
        userId: input.coachUserId,
        type: "coach.request",
        title: "New coaching request",
        body: `A player requested a session at ${startsAt.toLocaleString()}.`,
        entityType: "coach_request",
        entityId: id,
      });
      logInfo("coaches.request.ok", { requestId: id, coachUserId: input.coachUserId, userId });
      track("coach_request_created", { userId, coachUserId: input.coachUserId, requestId: id });
      return await CoachRequests.findOneAsync(id);
    });
  },

  async "coaches.respond"(input: { requestId: string; status: "accepted" | "declined" | "cancelled" | "completed" }) {
    return withMethodLog("coaches.respond", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { requestId: String, status: String });
      const row = await CoachRequests.findOneAsync(input.requestId);
      if (!row) throw new Meteor.Error("not-found", "Request not found");
      const isCoach = row.coachUserId === userId;
      const isPlayer = row.playerUserId === userId;
      if (!isCoach && !isPlayer) throw new Meteor.Error("forbidden", "Not your request");
      if (input.status === "cancelled" && !isPlayer) {
        throw new Meteor.Error("forbidden", "Only the player can cancel");
      }
      if (["accepted", "declined", "completed"].includes(input.status) && !isCoach) {
        throw new Meteor.Error("forbidden", "Only the coach can update this status");
      }
      await CoachRequests.updateAsync(input.requestId, {
        $set: { status: input.status, updatedAt: new Date() },
      });
      const notifyId = isCoach ? row.playerUserId : row.coachUserId;
      await notifyUser({
        userId: notifyId,
        type: "coach.request_update",
        title: "Coaching request updated",
        body: `Status is now ${input.status}.`,
        entityType: "coach_request",
        entityId: input.requestId,
      });
      logInfo("coaches.respond.ok", { requestId: input.requestId, status: input.status, userId });
      track("coach_request_updated", { userId, requestId: input.requestId, status: input.status });
      return await CoachRequests.findOneAsync(input.requestId);
    });
  },

  async "coaches.myRequests"() {
    return withMethodLog("coaches.myRequests", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const rows = await CoachRequests.find(
        { $or: [{ playerUserId: userId }, { coachUserId: userId }] },
        { sort: { createdAt: -1 }, limit: 40 },
      ).fetchAsync();
      const names = await displayNames(rows.flatMap((r) => [r.coachUserId, r.playerUserId]));
      logInfo("coaches.myRequests.ok", { userId, count: rows.length });
      return rows.map((r) => ({
        ...r,
        coachName: names.get(r.coachUserId) || "Coach",
        playerName: names.get(r.playerUserId) || "Player",
        mine: r.playerUserId === userId ? "player" : "coach",
      }));
    });
  },

  async "coaches.review"(input: { requestId: string; rating: number; comment?: string }) {
    return withMethodLog("coaches.review", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        requestId: String,
        rating: Number,
        comment: Match.Optional(String),
      });
      const rating = Math.round(input.rating);
      if (rating < 1 || rating > 5) throw new Meteor.Error("invalid-body", "Rating 1–5");
      const row = await CoachRequests.findOneAsync(input.requestId);
      if (!row) throw new Meteor.Error("not-found", "Request not found");
      if (row.playerUserId !== userId) throw new Meteor.Error("forbidden", "Only the player can review");
      if (!["accepted", "completed"].includes(row.status)) {
        throw new Meteor.Error("invalid-state", "Session must be accepted first");
      }
      if (row.startsAt.getTime() > Date.now()) {
        throw new Meteor.Error("invalid-state", "Review after the session time");
      }
      const existing = await CoachReviews.findOneAsync({ requestId: input.requestId });
      if (existing) throw new Meteor.Error("exists", "Already reviewed");
      const id = await CoachReviews.insertAsync({
        coachUserId: row.coachUserId,
        playerUserId: userId,
        requestId: input.requestId,
        rating,
        comment: input.comment?.trim(),
        createdAt: new Date(),
      });
      const all = await CoachReviews.find({ coachUserId: row.coachUserId }).fetchAsync();
      const ratingAvg = Math.round((all.reduce((s, r) => s + r.rating, 0) / all.length) * 10) / 10;
      await CoachProfiles.updateAsync(
        { userId: row.coachUserId },
        { $set: { ratingAvg, ratingCount: all.length, updatedAt: new Date() } },
      );
      if (row.status !== "completed") {
        await CoachRequests.updateAsync(input.requestId, {
          $set: { status: "completed", updatedAt: new Date() },
        });
      }
      logInfo("coaches.review.ok", { reviewId: id, coachUserId: row.coachUserId, rating });
      track("coach_reviewed", { userId, coachUserId: row.coachUserId, rating });
      return await CoachReviews.findOneAsync(id);
    });
  },
});
