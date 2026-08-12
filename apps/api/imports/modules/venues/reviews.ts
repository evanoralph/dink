import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Bookings, VenueReviews, Venues } from "../../collections";
import { requireUserId, userHasRole } from "../../lib/auth";
import { withMethodLog, logInfo, logDebug } from "../../lib/logger";

async function recomputeVenueRating(venueId: string) {
  const reviews = await VenueReviews.find({ venueId, hidden: { $ne: true } }).fetchAsync();
  const ratingCount = reviews.length;
  const ratingAvg =
    ratingCount === 0
      ? 0
      : Math.round(
          (reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10,
        ) / 10;
  await Venues.updateAsync(venueId, {
    $set: { ratingAvg, ratingCount, updatedAt: new Date() },
  });
  logInfo("reviews.recompute", { venueId, ratingAvg, ratingCount });
  return { ratingAvg, ratingCount };
}

Meteor.methods({
  async "reviews.listForVenue"(venueId: string) {
    return withMethodLog("reviews.listForVenue", this.userId, async () => {
      check(venueId, String);
      const venue = await Venues.findOneAsync(venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");
      if (
        venue.status !== "approved" &&
        !(await userHasRole(this.userId || "", "admin"))
      ) {
        throw new Meteor.Error("not-found", "Venue not found");
      }

      const isAdmin = await userHasRole(this.userId || "", "admin");
      const reviews = await VenueReviews.find(
        isAdmin ? { venueId } : { venueId, hidden: { $ne: true } },
        { sort: { createdAt: -1 }, limit: 50 },
      ).fetchAsync();

      const userIds = [...new Set(reviews.map((r) => r.userId))];
      const users = await Meteor.users
        .find({ _id: { $in: userIds } }, { fields: { "profile.displayName": 1 } })
        .fetchAsync();
      const nameById = new Map(
        users.map((u) => [u._id!, (u.profile as { displayName?: string })?.displayName || "Player"]),
      );

      const items = reviews.map((r) => ({
        ...r,
        createdAt: r.createdAt.toISOString(),
        displayName: nameById.get(r.userId) || "Player",
      }));

      logDebug("reviews.listForVenue.result", { venueId, count: items.length });
      return {
        venueId,
        ratingAvg: venue.ratingAvg ?? 0,
        ratingCount: venue.ratingCount ?? 0,
        reviews: items,
      };
    });
  },

  async "reviews.create"(input: { venueId: string; rating: number; comment?: string }) {
    return withMethodLog("reviews.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        venueId: String,
        rating: Number,
        comment: Match.Optional(String),
      });

      if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
        throw new Meteor.Error("invalid-rating", "Rating must be an integer from 1 to 5");
      }

      const venue = await Venues.findOneAsync(input.venueId);
      if (!venue || venue.status !== "approved") {
        throw new Meteor.Error("not-found", "Venue not found");
      }

      const existing = await VenueReviews.findOneAsync({
        venueId: input.venueId,
        userId,
      });
      if (existing) {
        throw new Meteor.Error("already-reviewed", "You already reviewed this venue");
      }

      const booking = await Bookings.findOneAsync({
        venueId: input.venueId,
        creatorUserId: userId,
        status: { $in: ["confirmed", "completed"] },
      });
      if (!booking) {
        throw new Meteor.Error(
          "not-eligible",
          "Book and complete a session before leaving a review",
        );
      }

      const now = new Date();
      const reviewId = await VenueReviews.insertAsync({
        venueId: input.venueId,
        userId,
        bookingId: booking._id,
        rating: input.rating,
        comment: input.comment?.trim() || undefined,
        createdAt: now,
      });

      const aggregates = await recomputeVenueRating(input.venueId);
      logInfo("reviews.create.ok", {
        reviewId,
        venueId: input.venueId,
        userId,
        rating: input.rating,
      });

      const review = await VenueReviews.findOneAsync(reviewId);
      const user = await Meteor.users.findOneAsync(userId, {
        fields: { "profile.displayName": 1 },
      });
      return {
        review: {
          ...review,
          createdAt: review!.createdAt.toISOString(),
          displayName:
            (user?.profile as { displayName?: string } | undefined)?.displayName || "Player",
        },
        ...aggregates,
      };
    });
  },
});
