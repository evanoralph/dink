import type { Role } from "./roles";

export type BookingStatus =
  | "draft"
  | "pending_payment"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "expired";

export type PaymentStatus = "pending" | "paid" | "failed" | "refunded" | "void";

export type GameStatus = "open" | "full" | "cancelled" | "completed";

export type VenueStatus = "pending" | "approved" | "rejected" | "suspended";

export interface PublicUser {
  _id: string;
  email?: string;
  profile: {
    displayName: string;
    city?: string;
    skillLevel?: number;
    onboardingComplete?: boolean;
  };
  roles: Role[];
}

export type GeoPoint = {
  type: "Point";
  coordinates: [number, number];
};

export interface VenueSummary {
  _id: string;
  name: string;
  city: string;
  address?: string;
  description?: string;
  courtCount: number;
  indoor?: boolean;
  covered?: boolean;
  airConditioned?: boolean;
  priceFrom?: number;
  currency: string;
  status: VenueStatus;
  imageUrls?: string[];
  location?: GeoPoint;
  ratingAvg?: number;
  ratingCount?: number;
  distanceKm?: number;
  openSlotsTonight?: number;
}

export interface VenueReview {
  _id: string;
  venueId: string;
  userId: string;
  bookingId?: string;
  rating: number;
  comment?: string;
  createdAt: string;
  displayName?: string;
}
