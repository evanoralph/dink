/**
 * Zod contracts for API validation (P1-18).
 * Keep aligned with packages/shared/src/schemas.ts
 */
import { z } from "zod";

export const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(2).max(80),
  inviteCode: z.string().min(4).max(16).optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
  email: z.string().email(),
});

export const profileUpdateSchema = z.object({
  displayName: z.string().min(2).max(80).optional(),
  city: z.string().min(2).max(80).optional(),
  skillLevel: z.number().min(2).max(5.5).optional(),
  onboardingComplete: z.boolean().optional(),
});

export const createBookingSchema = z.object({
  venueId: z.string().min(1),
  courtId: z.string().min(1),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime(),
  participantCount: z.number().int().min(1).max(8).optional(),
  idempotencyKey: z.string().min(8).max(80).optional(),
});

export const checkoutSchema = z.object({
  bookingId: z.string().min(1),
  provider: z.string().optional(),
});

export const inviteToPaySchema = z.object({
  bookingId: z.string().min(1),
  email: z.string().email(),
});

export const remindUnpaidSchema = z.object({
  bookingId: z.string().min(1),
});

export const gameRsvpSchema = z.object({
  gameId: z.string().min(1),
  status: z.enum(["going", "maybe", "declined"]),
});

export const createReportSchema = z.object({
  targetType: z.enum(["user", "venue", "review"]),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(120),
  details: z.string().max(2000).optional(),
});

export const createGameSchema = z.object({
  bookingId: z.string().optional(),
  venueId: z.string().min(1),
  courtId: z.string().optional(),
  startsAt: z.string().datetime(),
  format: z.enum(["singles", "doubles"]).optional(),
  skillMin: z.number().min(2).max(5.5),
  skillMax: z.number().min(2).max(5.5),
  capacity: z.number().int().min(2).max(8).optional(),
  pricePerPlayer: z.number().min(0).optional(),
  visibility: z.enum(["public", "invite"]).optional(),
  groupId: z.string().min(1).optional(),
});
