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
  idempotencyKey?: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
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
  pricePerPlayer?: number;
  status: GameStatus;
  inviteCode: string;
  createdAt: Date;
}

export interface GamePlayerDoc {
  _id?: string;
  gameId: string;
  userId: string;
  status: "joined" | "left";
  joinedAt: Date;
}

export interface MatchDoc {
  _id?: string;
  gameId: string;
  status: "pending" | "submitted" | "confirmed";
  startedAt?: Date;
  completedAt?: Date;
  verifiedAt?: Date;
  team1UserIds: string[];
  team2UserIds: string[];
  submittedBy?: string;
  confirmedBy?: string[];
  createdAt: Date;
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
  bookingId: string;
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

export const Venues = new Mongo.Collection<VenueDoc>("venues");
export const Courts = new Mongo.Collection<CourtDoc>("courts");
export const AvailabilityRules = new Mongo.Collection<AvailabilityRuleDoc>("availabilityRules");
export const PricingRules = new Mongo.Collection<PricingRuleDoc>("pricingRules");
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
