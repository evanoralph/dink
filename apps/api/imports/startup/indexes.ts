import { Meteor } from "meteor/meteor";
import {
  AdminAuditLogs,
  AvailabilityRules,
  BookingParticipants,
  Bookings,
  Courts,
  FeatureFlags,
  GamePlayers,
  Games,
  Matches,
  Notifications,
  Payments,
  PricingRules,
  VenueMemberships,
  VenueReviews,
  Venues,
} from "../collections";
import { logInfo } from "../lib/logger";

export async function ensureIndexes() {
  await Venues.createIndexAsync({ city: 1, status: 1 });
  await Venues.createIndexAsync({ ownerUserId: 1 });
  await Venues.createIndexAsync({ location: "2dsphere" });
  await VenueReviews.createIndexAsync({ venueId: 1, userId: 1 }, { unique: true });
  await VenueReviews.createIndexAsync({ venueId: 1, createdAt: -1 });
  await Courts.createIndexAsync({ venueId: 1, name: 1 }, { unique: true });
  await Courts.createIndexAsync({ venueId: 1, active: 1 });
  await AvailabilityRules.createIndexAsync({ courtId: 1, dayOfWeek: 1 });
  await PricingRules.createIndexAsync({ venueId: 1 });
  await Bookings.createIndexAsync({ courtId: 1, startsAt: 1, endsAt: 1 });
  await Bookings.createIndexAsync({ status: 1, expiresAt: 1 });
  await Bookings.createIndexAsync({ status: 1, createdAt: -1 });
  await Bookings.createIndexAsync({ venueId: 1, startsAt: 1 });
  await Bookings.createIndexAsync({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await BookingParticipants.createIndexAsync({ bookingId: 1, userId: 1 }, { unique: true });
  await Games.createIndexAsync({ venueId: 1, startsAt: 1, status: 1 });
  await Games.createIndexAsync({ status: 1, startsAt: 1 });
  await Games.createIndexAsync({ inviteCode: 1 }, { unique: true });
  await GamePlayers.createIndexAsync({ gameId: 1, userId: 1 }, { unique: true });
  await Matches.createIndexAsync({ gameId: 1 });
  await Matches.createIndexAsync({ status: 1, createdAt: -1 });
  await Payments.createIndexAsync({ bookingId: 1, userId: 1 });
  await Payments.createIndexAsync({ status: 1, createdAt: -1 });
  await Payments.createIndexAsync({ providerPaymentId: 1 }, { sparse: true });
  await Payments.createIndexAsync({ providerSessionId: 1 }, { sparse: true });
  await Notifications.createIndexAsync({ userId: 1, createdAt: -1 });
  await AdminAuditLogs.createIndexAsync({ createdAt: -1 });
  await AdminAuditLogs.createIndexAsync({ actorUserId: 1, createdAt: -1 });
  await VenueMemberships.createIndexAsync({ venueId: 1, userId: 1 }, { unique: true });
  await FeatureFlags.createIndexAsync({ key: 1 }, { unique: true });
  // Meteor users profile city for discovery
  await Meteor.users.createIndexAsync({ "profile.city": 1 });
  logInfo("indexes.ready");
}
