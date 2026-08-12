import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { RatingHistory } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { DEFAULT_RATING, RATING_K, ensureRating } from "../../lib/rating";
import { withMethodLog, logInfo } from "../../lib/logger";
import { displayNames } from "../../lib/userNames";

Meteor.methods({
  async "ratings.rules"() {
    return withMethodLog("ratings.rules", this.userId, async () => {
      return {
        start: DEFAULT_RATING,
        k: RATING_K,
        formula: "Elo: expected = 1 / (1 + 10^((opp - me) / 400)); delta = round(K * (score - expected))",
        doubles: "Team average rating vs opponent average; each player on the team gets the same delta.",
        when: "Applied when all participants confirm a match. Draws do not change rating. Voided disputes reverse deltas.",
      };
    });
  },

  async "ratings.me"() {
    return withMethodLog("ratings.me", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const rating = await ensureRating(userId);
      logInfo("ratings.me.ok", { userId, rating });
      return { userId, rating };
    });
  },

  async "ratings.history"(input?: { userId?: string }) {
    return withMethodLog("ratings.history", this.userId, async () => {
      const self = await requireUserId(this.userId);
      check(input, Match.Maybe({ userId: Match.Maybe(String) }));
      const userId = input?.userId || self;
      await ensureRating(userId);
      const rows = await RatingHistory.find(
        { userId },
        { sort: { createdAt: -1 }, limit: 50 },
      ).fetchAsync();
      logInfo("ratings.history.ok", { userId, count: rows.length });
      return rows;
    });
  },

  async "ratings.leaderboard"(filters?: { city?: string }) {
    return withMethodLog("ratings.leaderboard", this.userId, async () => {
      check(filters, Match.Maybe({ city: Match.Maybe(String) }));
      const query: Record<string, unknown> = { "profile.deletedAt": { $exists: false } };
      if (filters?.city) query["profile.city"] = filters.city;
      const users = await Meteor.users
        .find(query, { sort: { "profile.rating": -1 }, limit: 40, fields: { "profile.displayName": 1, "profile.city": 1, "profile.rating": 1 } })
        .fetchAsync();
      const names = await displayNames(users.map((u) => u._id!));
      logInfo("ratings.leaderboard.ok", { count: users.length });
      return users.map((u) => ({
        userId: u._id,
        displayName: names.get(u._id!) || u.profile?.displayName || "Player",
        city: u.profile?.city,
        rating: typeof u.profile?.rating === "number" ? u.profile.rating : DEFAULT_RATING,
      }));
    });
  },
});
