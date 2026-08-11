import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import {
  BookingParticipants,
  Bookings,
  Courts,
  Payments,
  PricingRules,
  Venues,
} from "../../collections";
import { requireUserId, userHasRole } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { resolveCheckoutProvider } from "../payments/providers";

const ACTIVE = ["pending_payment", "confirmed"] as const;

async function assertNoOverlap(courtId: string, startsAt: Date, endsAt: Date, excludeId?: string) {
  const query: Record<string, unknown> = {
    courtId,
    status: { $in: ACTIVE },
    startsAt: { $lt: endsAt },
    endsAt: { $gt: startsAt },
  };
  if (excludeId) query._id = { $ne: excludeId };
  const conflict = await Bookings.findOneAsync(query);
  if (conflict) {
    throw new Meteor.Error("slot-taken", "Court slot already booked");
  }
}

Meteor.methods({
  async "bookings.create"(input: {
    venueId: string;
    courtId: string;
    startsAt: string;
    endsAt: string;
    participantCount?: number;
    idempotencyKey?: string;
  }) {
    return withMethodLog("bookings.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        venueId: String,
        courtId: String,
        startsAt: String,
        endsAt: String,
        participantCount: Match.Optional(Number),
        idempotencyKey: Match.Optional(String),
      });

      if (input.idempotencyKey) {
        const existing = await Bookings.findOneAsync({ idempotencyKey: input.idempotencyKey });
        if (existing) {
          logInfo("bookings.create.idempotent", { bookingId: existing._id });
          return existing;
        }
      }

      const venue = await Venues.findOneAsync(input.venueId);
      const court = await Courts.findOneAsync(input.courtId);
      if (!venue || !court || court.venueId !== venue._id) {
        throw new Meteor.Error("not-found", "Venue or court not found");
      }

      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (!(startsAt < endsAt)) {
        throw new Meteor.Error("invalid-range", "Invalid booking time range");
      }

      await assertNoOverlap(input.courtId, startsAt, endsAt);

      const pricing = await PricingRules.findOneAsync({ courtId: input.courtId });
      const hours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
      const subtotal = Math.round((pricing?.price ?? venue.priceFrom ?? 0) * hours);
      const fees = Math.round(subtotal * 0.03);
      const total = subtotal + fees;
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 15 * 60_000);
      const participantCount = input.participantCount || 4;

      const bookingId = await Bookings.insertAsync({
        venueId: input.venueId,
        courtId: input.courtId,
        creatorUserId: userId,
        startsAt,
        endsAt,
        status: "pending_payment",
        subtotal,
        fees,
        total,
        currency: venue.currency,
        idempotencyKey: input.idempotencyKey || `bk_${Random.id()}`,
        createdAt: now,
        updatedAt: now,
        expiresAt,
      });

      // Re-check after insert to reduce race windows without requiring txn
      const conflicts = await Bookings.find({
        _id: { $ne: bookingId },
        courtId: input.courtId,
        status: { $in: ACTIVE },
        startsAt: { $lt: endsAt },
        endsAt: { $gt: startsAt },
      }).countAsync();
      if (conflicts > 0) {
        await Bookings.removeAsync(bookingId);
        throw new Meteor.Error("slot-taken", "Court slot already booked");
      }

      const share = Math.round(total / participantCount);
      await BookingParticipants.insertAsync({
        bookingId,
        userId,
        role: "organizer",
        paymentShare: share,
        paymentStatus: "pending",
      });

      const booking = await Bookings.findOneAsync(bookingId);
      logInfo("bookings.create.ok", { bookingId, status: booking?.status, total });
      return booking;
    });
  },

  async "bookings.get"(bookingId: string) {
    return withMethodLog("bookings.get", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(bookingId, String);
      const booking = await Bookings.findOneAsync(bookingId);
      if (!booking) throw new Meteor.Error("not-found", "Booking not found");
      const participant = await BookingParticipants.findOneAsync({ bookingId, userId });
      const isAdmin = await userHasRole(userId, "admin");
      if (!participant && booking.creatorUserId !== userId && !isAdmin) {
        throw new Meteor.Error("forbidden", "Not your booking");
      }
      const participants = await BookingParticipants.find({ bookingId }).fetchAsync();
      const payments = await Payments.find({ bookingId }).fetchAsync();
      return { booking, participants, payments };
    });
  },

  async "bookings.mine"() {
    return withMethodLog("bookings.mine", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const parts = await BookingParticipants.find({ userId }).fetchAsync();
      const ids = parts.map((p) => p.bookingId);
      const bookings = await Bookings.find(
        { _id: { $in: ids } },
        { sort: { startsAt: 1 } },
      ).fetchAsync();

      // P1-04: attach latest payment so UI can show retry / failed / pending.
      const payments = ids.length
        ? await Payments.find(
            { bookingId: { $in: ids } },
            { sort: { createdAt: -1 } },
          ).fetchAsync()
        : [];
      const latestByBooking = new Map<string, (typeof payments)[number]>();
      for (const p of payments) {
        if (!latestByBooking.has(p.bookingId)) latestByBooking.set(p.bookingId, p);
      }

      const enriched = bookings.map((b) => {
        const latestPayment = b._id ? latestByBooking.get(b._id) : undefined;
        return {
          ...b,
          latestPayment: latestPayment
            ? {
                _id: latestPayment._id,
                status: latestPayment.status,
                provider: latestPayment.provider,
                checkoutUrl: latestPayment.checkoutUrl,
              }
            : null,
        };
      });
      logInfo("bookings.mine.ok", { count: enriched.length, userId });
      return enriched;
    });
  },

  async "bookings.checkout"(input: { bookingId: string; provider?: string }) {
    return withMethodLog("bookings.checkout", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { bookingId: String, provider: Match.Optional(String) });
      const booking = await Bookings.findOneAsync(input.bookingId);
      if (!booking) throw new Meteor.Error("not-found", "Booking not found");
      if (booking.status !== "pending_payment") {
        throw new Meteor.Error("invalid-state", `Cannot checkout booking in ${booking.status}`);
      }
      if (booking.expiresAt && booking.expiresAt < new Date()) {
        await Bookings.updateAsync(booking._id!, {
          $set: { status: "expired", updatedAt: new Date() },
        });
        await Payments.updateAsync(
          { bookingId: booking._id!, status: "pending" },
          { $set: { status: "failed", updatedAt: new Date() } },
          { multi: true },
        );
        logInfo("bookings.checkout.expired", { bookingId: booking._id });
        throw new Meteor.Error(
          "expired",
          "Booking payment window expired. The slot was released — book again.",
        );
      }

      const participant = await BookingParticipants.findOneAsync({
        bookingId: booking._id!,
        userId,
      });
      if (!participant && booking.creatorUserId !== userId) {
        throw new Meteor.Error("forbidden", "Not your booking");
      }

      await assertNoOverlap(booking.courtId, booking.startsAt, booking.endsAt, booking._id);

      // P1-04: reuse open hosted checkout instead of creating duplicates.
      const openPayment = await Payments.findOneAsync(
        {
          bookingId: booking._id!,
          status: "pending",
          checkoutUrl: { $exists: true, $type: "string" },
        },
        { sort: { createdAt: -1 } },
      );
      if (openPayment?.checkoutUrl) {
        logInfo("bookings.checkout.reuse", {
          bookingId: booking._id,
          paymentId: openPayment._id,
        });
        return {
          booking,
          payment: openPayment,
          mode: "redirect" as const,
          checkoutUrl: openPayment.checkoutUrl,
          reused: true,
        };
      }

      // P1-01/P1-02: provider abstraction — stub instant OR PayMongo redirect (pending until webhook).
      const provider = await resolveCheckoutProvider(input.provider);
      const appUrl = process.env.APP_URL || process.env.ROOT_WEB_URL || "http://localhost:3000";
      const now = new Date();

      // Create pending payment row first so webhook can resolve by paymentId/session.
      const paymentId = await Payments.insertAsync({
        bookingId: booking._id!,
        userId,
        provider: provider.name,
        amount: booking.total,
        currency: booking.currency,
        status: "pending",
        webhookEventIds: [],
        createdAt: now,
        updatedAt: now,
      });

      const checkout = await provider.createCheckout({
        bookingId: booking._id!,
        paymentId,
        amount: booking.total,
        currency: booking.currency,
        description: `Dink court booking ${booking._id}`,
        successUrl: `${appUrl}/bookings?paid=1&bookingId=${booking._id}`,
        cancelUrl: `${appUrl}/bookings?cancelled=1&bookingId=${booking._id}`,
      });

      await Payments.updateAsync(paymentId, {
        $set: {
          providerPaymentId: checkout.providerPaymentId,
          providerSessionId: checkout.providerSessionId,
          checkoutUrl: checkout.checkoutUrl,
          status: checkout.status,
          metadata: checkout.raw ? { checkout: checkout.raw } : undefined,
          updatedAt: new Date(),
        },
      });

      if (checkout.mode === "instant" && checkout.status === "paid") {
        await BookingParticipants.updateAsync(
          { bookingId: booking._id!, userId },
          { $set: { paymentStatus: "paid" } },
        );
        await Bookings.updateAsync(booking._id!, {
          $set: { status: "confirmed", updatedAt: new Date() },
          $unset: { expiresAt: 1 },
        });
      } else {
        // Keep booking pending_payment until webhook confirms.
        logInfo("bookings.checkout.await_webhook", {
          bookingId: booking._id,
          paymentId,
          provider: provider.name,
          sessionId: checkout.providerSessionId,
        });
      }

      logInfo("bookings.checkout.ok", {
        bookingId: booking._id,
        paymentId,
        provider: provider.name,
        mode: checkout.mode,
        status: checkout.status,
        retry: Boolean(openPayment === undefined),
      });

      return {
        booking: await Bookings.findOneAsync(booking._id!),
        payment: await Payments.findOneAsync(paymentId),
        mode: checkout.mode,
        checkoutUrl: checkout.checkoutUrl || null,
        reused: false,
      };
    });
  },

  async "bookings.cancel"(bookingId: string) {
    return withMethodLog("bookings.cancel", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(bookingId, String);
      const booking = await Bookings.findOneAsync(bookingId);
      if (!booking) throw new Meteor.Error("not-found", "Booking not found");
      const isAdmin = await userHasRole(userId, "admin");
      if (booking.creatorUserId !== userId && !isAdmin) {
        throw new Meteor.Error("forbidden", "Not your booking");
      }
      if (!["pending_payment", "confirmed"].includes(booking.status)) {
        throw new Meteor.Error("invalid-state", "Cannot cancel this booking");
      }
      await Bookings.updateAsync(bookingId, {
        $set: { status: "cancelled", updatedAt: new Date() },
      });
      return await Bookings.findOneAsync(bookingId);
    });
  },

  async "bookings.manual"(input: {
    venueId: string;
    courtId: string;
    startsAt: string;
    endsAt: string;
    note?: string;
  }) {
    return withMethodLog("bookings.manual", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        venueId: String,
        courtId: String,
        startsAt: String,
        endsAt: String,
        note: Match.Optional(String),
      });
      const isStaff =
        (await userHasRole(userId, ["venue_owner", "venue_staff", "admin"]));
      if (!isStaff) throw new Meteor.Error("forbidden", "Staff only");

      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      await assertNoOverlap(input.courtId, startsAt, endsAt);
      const venue = await Venues.findOneAsync(input.venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");
      const now = new Date();
      const bookingId = await Bookings.insertAsync({
        venueId: input.venueId,
        courtId: input.courtId,
        creatorUserId: userId,
        startsAt,
        endsAt,
        status: "confirmed",
        subtotal: venue.priceFrom || 0,
        fees: 0,
        total: venue.priceFrom || 0,
        currency: venue.currency,
        idempotencyKey: `manual_${Random.id()}`,
        createdAt: now,
        updatedAt: now,
      });
      await BookingParticipants.insertAsync({
        bookingId,
        userId,
        role: "organizer",
        paymentShare: venue.priceFrom || 0,
        paymentStatus: "paid",
      });
      return await Bookings.findOneAsync(bookingId);
    });
  },
});
