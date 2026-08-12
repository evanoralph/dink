import { Mongo } from "meteor/mongo";

export type VenueStatus = "pending" | "approved" | "rejected" | "suspended";
export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "expired";
export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "void";
export type GameStatus = "open" | "full" | "cancelled" | "completed";

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number]; // [lng, lat]
};

export interface VenueDoc {
  _id?: string;
  name: string;
  city: string;
  address?: string;
  description?: string;
  indoor?: boolean;
  covered?: boolean;
  airConditioned?: boolean;
  courtCount: number;
  priceFrom?: number;
  currency: string;
  status: VenueStatus;
  ownerUserId: string;
  staffUserIds: string[];
  imageUrls?: string[];
  location?: GeoPoint;
  ratingAvg?: number;
  ratingCount?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface VenueReviewDoc {
  _id?: string;
  venueId: string;
  userId: string;
  bookingId?: string;
  rating: number;
  comment?: string;
  hidden?: boolean;
  createdAt: Date;
}

export interface CourtDoc {
  _id?: string;
  venueId: string;
  name: string;
  surface?: string;
  active: boolean;
  createdAt: Date;
}

export interface AvailabilityRuleDoc {
  _id?: string;
  courtId: string;
  venueId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
}

export interface PricingRuleDoc {
  _id?: string;
  venueId: string;
  courtId?: string;
  days: number[];
  startTime: string;
  endTime: string;
  price: number;
  pricingType: "hourly" | "peak" | "offpeak";
}

/** Owner/staff block-outs — slots overlapping these are unavailable to players. */
export interface CourtBlackoutDoc {
  _id?: string;
  venueId: string;
  courtId: string;
  startsAt: Date;
  endsAt: Date;
  reason?: string;
  createdBy: string;
  createdAt: Date;
}

export interface BookingDoc {
  _id?: string;
  venueId: string;
  courtId: string;
  creatorUserId: string;
  startsAt: Date;
  endsAt: Date;
  status: BookingStatus;
  subtotal: number;
  fees: number;
  total: number;
  currency: string;
  /** P4-07: member pack discount applied at create. */
  memberPassId?: string;
  memberDiscountPct?: number;
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  /** P2-04: reliability already applied for this booking. */
  reliabilityApplied?: boolean;
  /** P2-08: upcoming reminder already sent. */
  reminderSentAt?: Date;
}

export interface BookingParticipantDoc {
  _id?: string;
  bookingId: string;
  userId: string;
  role: "organizer" | "player";
  paymentShare: number;
  paymentStatus: PaymentStatus;
}

export interface GameDoc {
  _id?: string;
  bookingId?: string;
  venueId: string;
  courtId?: string;
  organizerUserId: string;
  startsAt: Date;
  format: "singles" | "doubles";
  skillMin: number;
  skillMax: number;
  visibility: "public" | "invite";
  capacity: number;
  playerCount: number;
  waitlistCount?: number;
  pricePerPlayer?: number;
  status: GameStatus;
  inviteCode: string;
  createdAt: Date;
  reminderSentAt?: Date;
  /** P3-02: posted into a group feed. */
  groupId?: string;
  /** P3-05: recurring open-play series. */
  seriesId?: string;
}

export interface GamePlayerDoc {
  _id?: string;
  gameId: string;
  userId: string;
  /** joined = going (P2-03 RSVP). waitlist = P3-05. */
  status: "joined" | "left" | "maybe" | "declined" | "waitlist";
  joinedAt: Date;
}

export interface MatchDoc {
  _id?: string;
  gameId: string;
  status: "pending" | "submitted" | "confirmed" | "voided";
  startedAt?: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  team1UserIds: string[];
  team2UserIds: string[];
  submittedBy?: string;
  confirmedBy?: string[];
  createdAt: Date;
  ratingApplied?: boolean;
  disputed?: boolean;
}

export interface MatchSetDoc {
  _id?: string;
  matchId: string;
  setNumber: number;
  team1Score: number;
  team2Score: number;
}

export interface PaymentDoc {
  _id?: string;
  bookingId?: string;
  tournamentId?: string;
  packId?: string;
  userId: string;
  provider: string;
  /** Provider charge/payment id (e.g. pay_xxx or stub_xxx). */
  providerPaymentId?: string;
  /** Hosted checkout session id (e.g. PayMongo cs_xxx). */
  providerSessionId?: string;
  /** Redirect URL for hosted checkout (PayMongo). */
  checkoutUrl?: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  /** Processed webhook event ids for idempotency. */
  webhookEventIds?: string[];
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface NotificationDoc {
  _id?: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: Date;
  entityType?: string;
  entityId?: string;
  emailStatus?: "sent" | "skipped" | "failed";
}

export interface FeatureFlagDoc {
  _id?: string;
  key: string;
  enabled: boolean;
  description?: string;
  updatedAt: Date;
}

export interface VenueMembershipDoc {
  _id?: string;
  venueId: string;
  userId: string;
  role: "venue_owner" | "venue_staff";
  createdAt: Date;
}

export interface AdminAuditLogDoc {
  _id?: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: Date;
}

export type ReportTargetType = "user" | "venue" | "review";
export type ReportStatus = "open" | "reviewed" | "actioned" | "dismissed";

/** P2-05: player/venue/review moderation queue. */
export interface ReportDoc {
  _id?: string;
  reporterUserId: string;
  targetType: ReportTargetType;
  targetId: string;
  reason: string;
  details?: string;
  status: ReportStatus;
  createdAt: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  action?: string;
}

/** P3-01 */
export interface GroupDoc {
  _id?: string;
  name: string;
  city: string;
  description?: string;
  creatorUserId: string;
  visibility: "public" | "invite";
  memberCount: number;
  createdAt: Date;
}

export interface GroupMemberDoc {
  _id?: string;
  groupId: string;
  userId: string;
  role: "owner" | "member";
  status: "joined" | "left";
  joinedAt: Date;
}

/** P3-03 */
export interface ChatMessageDoc {
  _id?: string;
  channelType: "game" | "group";
  channelId: string;
  userId: string;
  body: string;
  createdAt: Date;
}

/** P3-04 */
export interface FriendshipDoc {
  _id?: string;
  fromUserId: string;
  toUserId: string;
  status: "pending" | "accepted";
  createdAt: Date;
}

/** P3-06 */
export interface CoachProfileDoc {
  _id?: string;
  userId: string;
  city: string;
  bio?: string;
  hourlyRate: number;
  currency: string;
  active: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/** P3-07 */
export type CoachRequestStatus = "pending" | "accepted" | "declined" | "cancelled" | "completed";

export interface CoachRequestDoc {
  _id?: string;
  coachUserId: string;
  playerUserId: string;
  venueId?: string;
  startsAt: Date;
  note?: string;
  status: CoachRequestStatus;
  createdAt: Date;
  updatedAt: Date;
}

/** P3-10 */
export interface CoachReviewDoc {
  _id?: string;
  coachUserId: string;
  playerUserId: string;
  requestId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export const Venues = new Mongo.Collection<VenueDoc>("venues");
export const Courts = new Mongo.Collection<CourtDoc>("courts");
export const AvailabilityRules = new Mongo.Collection<AvailabilityRuleDoc>("availabilityRules");
export const PricingRules = new Mongo.Collection<PricingRuleDoc>("pricingRules");
export const CourtBlackouts = new Mongo.Collection<CourtBlackoutDoc>("courtBlackouts");
export const Bookings = new Mongo.Collection<BookingDoc>("bookings");
export const BookingParticipants = new Mongo.Collection<BookingParticipantDoc>("bookingParticipants");
export const Games = new Mongo.Collection<GameDoc>("games");
export const GamePlayers = new Mongo.Collection<GamePlayerDoc>("gamePlayers");
export const Matches = new Mongo.Collection<MatchDoc>("matches");
export const MatchSets = new Mongo.Collection<MatchSetDoc>("matchSets");
export const Payments = new Mongo.Collection<PaymentDoc>("payments");
export const Notifications = new Mongo.Collection<NotificationDoc>("notifications");
export const FeatureFlags = new Mongo.Collection<FeatureFlagDoc>("featureFlags");
export const VenueMemberships = new Mongo.Collection<VenueMembershipDoc>("venueMemberships");
export const AdminAuditLogs = new Mongo.Collection<AdminAuditLogDoc>("adminAuditLogs");
export const VenueReviews = new Mongo.Collection<VenueReviewDoc>("venueReviews");
export const Reports = new Mongo.Collection<ReportDoc>("reports");
export const Groups = new Mongo.Collection<GroupDoc>("groups");
export const GroupMembers = new Mongo.Collection<GroupMemberDoc>("groupMembers");
export const ChatMessages = new Mongo.Collection<ChatMessageDoc>("chatMessages");
export const Friendships = new Mongo.Collection<FriendshipDoc>("friendships");
export const CoachProfiles = new Mongo.Collection<CoachProfileDoc>("coachProfiles");
export const CoachRequests = new Mongo.Collection<CoachRequestDoc>("coachRequests");
export const CoachReviews = new Mongo.Collection<CoachReviewDoc>("coachReviews");

/** P4-01 */
export interface RatingHistoryDoc {
  _id?: string;
  userId: string;
  matchId: string;
  before: number;
  after: number;
  delta: number;
  reversed?: boolean;
  createdAt: Date;
}

/** P4-02 */
export interface LeagueDoc {
  _id?: string;
  name: string;
  city: string;
  seasonName: string;
  format: "singles" | "doubles";
  status: "open" | "active" | "completed";
  creatorUserId: string;
  createdAt: Date;
}

export interface LeagueMemberDoc {
  _id?: string;
  leagueId: string;
  userId: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  joinedAt: Date;
}

export interface LeagueResultDoc {
  _id?: string;
  leagueId: string;
  matchId?: string;
  team1UserIds: string[];
  team2UserIds: string[];
  team1Sets: number;
  team2Sets: number;
  recordedBy: string;
  createdAt: Date;
}

/** P4-03 */
export interface LadderDoc {
  _id?: string;
  name: string;
  city: string;
  creatorUserId: string;
  createdAt: Date;
}

export interface LadderEntryDoc {
  _id?: string;
  ladderId: string;
  userId: string;
  rank: number;
  wins: number;
  losses: number;
  joinedAt: Date;
}

export interface LadderChallengeDoc {
  _id?: string;
  ladderId: string;
  challengerId: string;
  defenderId: string;
  status: "pending" | "accepted" | "declined" | "completed";
  team1Sets?: number;
  team2Sets?: number;
  createdAt: Date;
  resolvedAt?: Date;
}

/** P4-04 / P4-05 */
export interface TournamentDoc {
  _id?: string;
  name: string;
  city: string;
  venueId?: string;
  startsAt: Date;
  entryFee: number;
  currency: string;
  format: "single_elim" | "round_robin";
  capacity: number;
  status: "open" | "closed" | "in_progress" | "completed";
  creatorUserId: string;
  createdAt: Date;
}

export interface TournamentEntryDoc {
  _id?: string;
  tournamentId: string;
  userId: string;
  seed: number;
  paymentStatus: "pending" | "paid";
  paymentId?: string;
  createdAt: Date;
}

export interface TournamentMatchDoc {
  _id?: string;
  tournamentId: string;
  round: number;
  slot: number;
  player1Id?: string;
  player2Id?: string;
  winnerId?: string;
  status: "pending" | "bye" | "complete";
  createdAt: Date;
}

/** P4-07 — player passes (not staff VenueMemberships). */
export interface VenuePackDoc {
  _id?: string;
  venueId: string;
  name: string;
  price: number;
  currency: string;
  discountPct: number;
  durationDays: number;
  visitsIncluded?: number;
  active: boolean;
  createdAt: Date;
}

export interface VenuePassDoc {
  _id?: string;
  venueId: string;
  userId: string;
  packId: string;
  expiresAt: Date;
  remainingVisits?: number;
  status: "active" | "expired";
  createdAt: Date;
}

/** P4-08 */
export interface MatchDisputeDoc {
  _id?: string;
  matchId: string;
  reporterUserId: string;
  reason: string;
  status: "open" | "dismissed" | "voided";
  note?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
}

export const RatingHistory = new Mongo.Collection<RatingHistoryDoc>("ratingHistory");
export const Leagues = new Mongo.Collection<LeagueDoc>("leagues");
export const LeagueMembers = new Mongo.Collection<LeagueMemberDoc>("leagueMembers");
export const LeagueResults = new Mongo.Collection<LeagueResultDoc>("leagueResults");
export const Ladders = new Mongo.Collection<LadderDoc>("ladders");
export const LadderEntries = new Mongo.Collection<LadderEntryDoc>("ladderEntries");
export const LadderChallenges = new Mongo.Collection<LadderChallengeDoc>("ladderChallenges");
export const Tournaments = new Mongo.Collection<TournamentDoc>("tournaments");
export const TournamentEntries = new Mongo.Collection<TournamentEntryDoc>("tournamentEntries");
export const TournamentMatches = new Mongo.Collection<TournamentMatchDoc>("tournamentMatches");
export const VenuePacks = new Mongo.Collection<VenuePackDoc>("venuePacks");
export const VenuePasses = new Mongo.Collection<VenuePassDoc>("venuePasses");
export const MatchDisputes = new Mongo.Collection<MatchDisputeDoc>("matchDisputes");
