import { Meteor } from "meteor/meteor";
import {
  AdminAuditLogs,
  AvailabilityRules,
  BookingParticipants,
  Bookings,
  CourtBlackouts,
  Courts,
  FeatureFlags,
  GamePlayers,
  Reports,
  Groups,
  GroupMembers,
  ChatMessages,
  Friendships,
  CoachProfiles,
  CoachRequests,
  CoachReviews,
  RatingHistory,
  Leagues,
  LeagueMembers,
  LeagueResults,
  Ladders,
  LadderEntries,
  LadderChallenges,
  Tournaments,
  TournamentEntries,
  TournamentMatches,
  VenuePacks,
  VenuePasses,
  MatchDisputes,
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
  await AvailabilityRules.createIndexAsync({ venueId: 1 });
  await PricingRules.createIndexAsync({ venueId: 1 });
  await PricingRules.createIndexAsync({ courtId: 1 });
  await CourtBlackouts.createIndexAsync({ venueId: 1, startsAt: 1 });
  await CourtBlackouts.createIndexAsync({ courtId: 1, startsAt: 1, endsAt: 1 });
  await Bookings.createIndexAsync({ courtId: 1, startsAt: 1, endsAt: 1 });
  // P2-12: one active hold/confirmed booking per court+start (concurrent checkout safety).
  try {
    await Bookings.createIndexAsync(
      { courtId: 1, startsAt: 1 },
      {
        unique: true,
        name: "bookings_active_slot",
        partialFilterExpression: { status: { $in: ["pending_payment", "confirmed"] } },
      },
    );
  } catch (err) {
    logInfo("indexes.bookings_active_slot.skip", {
      message: err instanceof Error ? err.message : String(err),
      hint: "Resolve duplicate active bookings then restart API",
    });
  }
  await Bookings.createIndexAsync({ status: 1, expiresAt: 1 });
  await Bookings.createIndexAsync({ status: 1, createdAt: -1 });
  await Bookings.createIndexAsync({ venueId: 1, startsAt: 1 });
  await Bookings.createIndexAsync({ idempotencyKey: 1 }, { unique: true, sparse: true });
  await BookingParticipants.createIndexAsync({ bookingId: 1, userId: 1 }, { unique: true });
  await Games.createIndexAsync({ venueId: 1, startsAt: 1, status: 1 });
  await Games.createIndexAsync({ status: 1, startsAt: 1 });
  await Games.createIndexAsync({ inviteCode: 1 }, { unique: true });
  await Games.createIndexAsync({ groupId: 1, startsAt: 1 });
  await Games.createIndexAsync({ seriesId: 1, startsAt: 1 });
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
  await Reports.createIndexAsync({ status: 1, createdAt: -1 });
  await Reports.createIndexAsync({ targetType: 1, targetId: 1 });
  await Groups.createIndexAsync({ city: 1, visibility: 1 });
  await Groups.createIndexAsync({ creatorUserId: 1 });
  await GroupMembers.createIndexAsync({ groupId: 1, userId: 1 }, { unique: true });
  await GroupMembers.createIndexAsync({ userId: 1, status: 1 });
  await ChatMessages.createIndexAsync({ channelType: 1, channelId: 1, createdAt: -1 });
  await Friendships.createIndexAsync({ fromUserId: 1, toUserId: 1 }, { unique: true });
  await Friendships.createIndexAsync({ toUserId: 1, status: 1 });
  await CoachProfiles.createIndexAsync({ userId: 1 }, { unique: true });
  await CoachProfiles.createIndexAsync({ city: 1, active: 1 });
  await CoachRequests.createIndexAsync({ coachUserId: 1, status: 1, startsAt: 1 });
  await CoachRequests.createIndexAsync({ playerUserId: 1, createdAt: -1 });
  await CoachReviews.createIndexAsync({ requestId: 1 }, { unique: true });
  await CoachReviews.createIndexAsync({ coachUserId: 1, createdAt: -1 });
  // Meteor users profile city for discovery
  await Meteor.users.createIndexAsync({ "profile.city": 1 });
  await Meteor.users.createIndexAsync({ "profile.inviteCode": 1 }, { unique: true, sparse: true });
  await Meteor.users.createIndexAsync({ "profile.rating": -1 });
  await RatingHistory.createIndexAsync({ userId: 1, createdAt: -1 });
  await RatingHistory.createIndexAsync({ matchId: 1 });
  await Leagues.createIndexAsync({ city: 1, status: 1 });
  await LeagueMembers.createIndexAsync({ leagueId: 1, userId: 1 }, { unique: true });
  await LeagueResults.createIndexAsync({ leagueId: 1, createdAt: -1 });
  await Ladders.createIndexAsync({ city: 1 });
  await LadderEntries.createIndexAsync({ ladderId: 1, userId: 1 }, { unique: true });
  await LadderEntries.createIndexAsync({ ladderId: 1, rank: 1 });
  await LadderChallenges.createIndexAsync({ ladderId: 1, status: 1 });
  await Tournaments.createIndexAsync({ city: 1, startsAt: 1 });
  await TournamentEntries.createIndexAsync({ tournamentId: 1, userId: 1 }, { unique: true });
  await TournamentMatches.createIndexAsync({ tournamentId: 1, round: 1, slot: 1 });
  await VenuePacks.createIndexAsync({ venueId: 1, active: 1 });
  await VenuePasses.createIndexAsync({ userId: 1, venueId: 1, status: 1 });
  await MatchDisputes.createIndexAsync({ status: 1, createdAt: -1 });
  await MatchDisputes.createIndexAsync({ matchId: 1 });
  logInfo("indexes.ready");
}
