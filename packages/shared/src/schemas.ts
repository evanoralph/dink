import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  skillLevel: z.number().min(2).max(5.5).optional(),
  onboardingComplete: z.boolean().optional(),
});

export const geoPointSchema = z.object({
  type: z.literal("Point"),
  coordinates: z.tuple([z.number().min(-180).max(180), z.number().min(-90).max(90)]),
});

export const createVenueSchema = z.object({
  name: z.string().min(2).max(120),
  city: z.string().min(2).max(80),
  address: z.string().min(2).max(200).optional(),
  indoor: z.boolean().optional(),
  covered: z.boolean().optional(),
  airConditioned: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  imageUrls: z.array(z.string().url()).max(12).optional(),
  location: geoPointSchema.optional(),
});

export const updateVenueSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  city: z.string().min(2).max(80).optional(),
  address: z.string().min(2).max(200).optional(),
  indoor: z.boolean().optional(),
  covered: z.boolean().optional(),
  airConditioned: z.boolean().optional(),
  description: z.string().max(2000).optional(),
  imageUrls: z.array(z.string().url()).max(12).optional(),
  location: geoPointSchema.nullable().optional(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

export const createVenueReviewSchema = z.object({
  venueId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(2000).optional(),
});

export const createCourtSchema = z.object({
  venueId: z.string().min(1),
  name: z.string().min(1).max(80),
  surface: z.string().optional(),
});

export const createBookingSchema = z.object({
  venueId: z.string().min(1),
  courtId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  participantCount: z.number().int().min(1).max(8).default(4),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export const createGameSchema = z.object({
  bookingId: z.string().optional(),
  venueId: z.string().min(1),
  courtId: z.string().optional(),
  startsAt: z.string().datetime(),
  format: z.enum(["singles", "doubles"]).default("doubles"),
  skillMin: z.number().min(2).max(5.5),
  skillMax: z.number().min(2).max(5.5),
  capacity: z.number().int().min(2).max(8).default(4),
  pricePerPlayer: z.number().min(0).optional(),
  visibility: z.enum(["public", "invite"]).default("public"),
});

export const matchResultSchema = z.object({
  gameId: z.string().min(1),
  sets: z
    .array(
      z.object({
        setNumber: z.number().int().min(1),
        team1Score: z.number().int().min(0),
        team2Score: z.number().int().min(0),
      }),
    )
    .min(1),
  team1UserIds: z.array(z.string()).min(1),
  team2UserIds: z.array(z.string()).min(1),
});
