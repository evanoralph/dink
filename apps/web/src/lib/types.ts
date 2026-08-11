export type Role =
  | "player"
  | "coach"
  | "organizer"
  | "venue_staff"
  | "venue_owner"
  | "admin";

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

export interface Venue {
  _id: string;
  name: string;
  city: string;
  address?: string;
  courtCount: number;
  indoor?: boolean;
  covered?: boolean;
  airConditioned?: boolean;
  priceFrom?: number;
  currency: string;
  status: string;
  description?: string;
  imageUrls?: string[];
  location?: GeoPoint;
  ratingAvg?: number;
  ratingCount?: number;
  distanceKm?: number;
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

export interface Court {
  _id: string;
  venueId: string;
  name: string;
  surface?: string;
  active: boolean;
}

export interface Booking {
  _id: string;
  venueId: string;
  courtId: string;
  creatorUserId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  subtotal: number;
  fees: number;
  total: number;
  currency: string;
}

export interface Game {
  _id: string;
  venueId: string;
  courtId?: string;
  organizerUserId: string;
  startsAt: string;
  format: "singles" | "doubles";
  skillMin: number;
  skillMax: number;
  capacity: number;
  playerCount: number;
  pricePerPlayer?: number;
  status: string;
  inviteCode: string;
}
