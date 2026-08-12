import { Accounts } from "meteor/accounts-base";
import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import {
  BookingParticipants,
  Bookings,
  Courts,
  Payments,
  PricingRules,
  VenuePacks,
  VenuePasses,
  Venues,
} from "../../collections";
import { assertBookingCancellable, cancelPolicyCopy } from "../../lib/cancelPolicy";
import { requireUserId, userHasRole } from "../../lib/auth";
import { sendOpsAlert } from "../../lib/alerts";
import { withMethodLog, logInfo, logWarn } from "../../lib/logger";
import { incrMetric } from "../../lib/metrics";
import { parseBody } from "../../lib/validate";
import { applyBookingReliability } from "../../lib/reliability";
import { applyParticipantPaid, isSplitRoster, rebalanceShares } from "../../lib/splitPay";
import {
  checkoutSchema,
  createBookingSchema,
  inviteToPaySchema,
  remindUnpaidSchema,
} from "../../lib/zodSchemas";
import { track } from "../../lib/analytics";
import { notifyUser } from "../notifications/service";
import { resolveCheckoutProvider } from "../payments/providers";

const ACTIVE = ["pending_payment", "confirmed"] as const;

async function recordBookingConflict(fields: Record<string, unknown>) {
  const count = incrMetric("booking.conflicts");
  logWarn("booking.conflict.alert", { ...fields, conflictCount: count });
  // Spike signal for ops (P1-30 / P1-33)
  if (count === 1 || count % 10 === 0) {
    void sendOpsAlert("Booking conflict spike", { ...fields, conflictCount: count });
  }
}

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
    await recordBookingConflict({
      courtId,
      conflictingBookingId: conflict._id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      stage: "precheck",
    });
    throw new Meteor.Error("slot-taken", "Court slot already booked");
  }
}

Meteor.methods({
  async "bookings.create"(input: unknown) {
    return withMethodLog("bookings.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(createBookingSchema, input, "booking");

      if (body.idempotencyKey) {
        const existing = await Bookings.findOneAsync({ idempotencyKey: body.idempotencyKey });
        if (existing) {
          logInfo("bookings.create.idempotent", { bookingId: existing._id });
          return existing;
        }
      }

      const venue = await Venues.findOneAsync(body.venueId);
      const court = await Courts.findOneAsync(body.courtId);
      if (!venue || !court || court.venueId !== venue._id) {
        throw new Meteor.Error("not-found", "Venue or court not found");
      }

      const startsAt = new Date(body.startsAt);
      const endsAt = new Date(body.endsAt);
      if (!(startsAt < endsAt)) {
        throw new Meteor.Error("invalid-range", "Invalid booking time range");
      }

      await assertNoOverlap(body.courtId, startsAt, endsAt);

      const dayOfWeek = startsAt.getUTCDay();
      const hh = String(startsAt.getUTCHours()).padStart(2, "0");
      const mm = String(startsAt.getUTCMinutes()).padStart(2, "0");
      const t = `${hh}:${mm}`;
      const pricingRules = await PricingRules.find({ venueId: body.venueId }).fetchAsync();
      const matched = pricingRules
        .filter(
          (p) =>
            (!p.courtId || p.courtId === body.courtId) &&
            p.days.includes(dayOfWeek) &&
            p.startTime <= t &&
            t < p.endTime,
        )
        .sort((a, b) => {
          const courtScore = (x: typeof a) => (x.courtId ? 0 : 1);
          const typeScore = (x: typeof a) =>
            x.pricingType === "peak" ? 0 : x.pricingType === "hourly" ? 1 : 2;
          return courtScore(a) - courtScore(b) || typeScore(a) - typeScore(b);
        })[0];
      const hours = (endsAt.getTime() - startsAt.getTime()) / 3_600_000;
      const now = new Date();
      let subtotal = Math.round((matched?.price ?? venue.priceFrom ?? 0) * hours);
      let memberPassId: string | undefined;
      let memberDiscountPct: number | undefined;
      const pass = await VenuePasses.findOneAsync({
        venueId: body.venueId,
        userId,
        status: "active",
        expiresAt: { $gt: now },
      });
      if (pass) {
        const pack = await VenuePacks.findOneAsync(pass.packId);
        const pct = pack?.discountPct || 0;
        if (pct > 0) {
          subtotal = Math.round(subtotal * (1 - pct / 100));
          memberPassId = pass._id;
          memberDiscountPct = pct;
          if (typeof pass.remainingVisits === "number") {
            const left = Math.max(0, pass.remainingVisits - 1);
            await VenuePasses.updateAsync(pass._id!, {
              $set: {
                remainingVisits: left,
                status: left <= 0 ? "expired" : "active",
              },
            });
          }
          logInfo("bookings.create.member_price", {
            userId,
            venueId: body.venueId,
            discountPct: pct,
            passId: pass._id,
          });
        }
      }
      const fees = Math.round(subtotal * 0.03);
      const total = subtotal + fees;
      const holdMin = Math.max(5, Number(process.env.BOOKING_HOLD_MINUTES || 15) || 15);
      const expiresAt = new Date(now.getTime() + holdMin * 60_000);
      const participantCount = body.participantCount || 4;

      let bookingId: string;
      try {
        bookingId = await Bookings.insertAsync({
          venueId: body.venueId,
          courtId: body.courtId,
          creatorUserId: userId,
          startsAt,
          endsAt,
          status: "pending_payment",
          subtotal,
          fees,
          total,
          currency: venue.currency,
          memberPassId,
          memberDiscountPct,
          idempotencyKey: body.idempotencyKey || `bk_${Random.id()}`,
          createdAt: now,
          updatedAt: now,
          expiresAt,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const duplicate =
          msg.includes("E11000") ||
          (typeof err === "object" && err && "code" in err && (err as { code?: number }).code === 11000);
        if (duplicate) {
          await recordBookingConflict({
            courtId: body.courtId,
            startsAt: startsAt.toISOString(),
            endsAt: endsAt.toISOString(),
            stage: "unique_index",
          });
          throw new Meteor.Error("slot-taken", "Court slot already booked");
        }
        throw err;
      }

      // Re-check after insert to reduce race windows without requiring txn
      const conflicts = await Bookings.find({
        _id: { $ne: bookingId },
        courtId: body.courtId,
        status: { $in: ACTIVE },
        startsAt: { $lt: endsAt },
        endsAt: { $gt: startsAt },
      }).countAsync();
      if (conflicts > 0) {
        await Bookings.removeAsync(bookingId);
        await recordBookingConflict({
          courtId: body.courtId,
          bookingId,
          startsAt: startsAt.toISOString(),
          endsAt: endsAt.toISOString(),
          stage: "post_insert_race",
        });
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
      logInfo("bookings.create.ok", {
        bookingId,
        status: booking?.status,
        total,
        holdMin,
      });
      track("booking_started", {
        userId,
        bookingId,
        venueId: body.venueId,
        courtId: body.courtId,
        total,
      });
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
      const userIds = [...new Set(participants.map((p) => p.userId))];
      const users = await Meteor.users
        .find(
          { _id: { $in: userIds } },
          { fields: { emails: 1, "profile.displayName": 1, "profile.reliabilityLevel": 1 } },
        )
        .fetchAsync();
      const byId = new Map(users.map((u) => [u._id!, u]));
      const roster = participants.map((p) => {
        const u = byId.get(p.userId);
        return {
          ...p,
          displayName: u?.profile?.displayName || "Player",
          email: u?.emails?.[0]?.address,
          reliabilityLevel: u?.profile?.reliabilityLevel || "new",
        };
      });
      const split = isSplitRoster(participants.length);
      const myShare = participants.find((p) => p.userId === userId);
      logInfo("bookings.get.ok", {
        bookingId,
        roster: roster.length,
        split,
        myStatus: myShare?.paymentStatus,
      });
      return {
        booking,
        participants: roster,
        payments,
        split,
        myPaymentStatus: myShare?.paymentStatus || null,
        myPaymentShare: myShare?.paymentShare ?? booking.total,
      };
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

  async "bookings.checkout"(input: unknown) {
    return withMethodLog("bookings.checkout", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const parsed = parseBody(checkoutSchema, input, "checkout");
      const booking = await Bookings.findOneAsync(parsed.bookingId);
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
      if (participant?.paymentStatus === "paid") {
        throw new Meteor.Error("already-paid", "Your share is already paid");
      }

      await assertNoOverlap(booking.courtId, booking.startsAt, booking.endsAt, booking._id);

      const roster = await BookingParticipants.find({ bookingId: booking._id! }).fetchAsync();
      const split = isSplitRoster(roster.length);
      const amount = split ? participant?.paymentShare ?? booking.total : booking.total;
      logInfo("bookings.checkout.split", {
        bookingId: booking._id,
        split,
        amount,
        roster: roster.length,
      });

      // P1-04: reuse open hosted checkout instead of creating duplicates (this payer only).
      const openPayment = await Payments.findOneAsync(
        {
          bookingId: booking._id!,
          userId,
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
      const provider = await resolveCheckoutProvider(parsed.provider);
      const appUrl = process.env.APP_URL || process.env.ROOT_WEB_URL || "http://localhost:3000";
      const now = new Date();

      // Create pending payment row first so webhook can resolve by paymentId/session.
      const paymentId = await Payments.insertAsync({
        bookingId: booking._id!,
        userId,
        provider: provider.name,
        amount,
        currency: booking.currency,
        status: "pending",
        webhookEventIds: [],
        createdAt: now,
        updatedAt: now,
      });

      const checkout = await provider.createCheckout({
        bookingId: booking._id!,
        paymentId,
        amount,
        currency: booking.currency,
        description: split
          ? `Dink share ₱${amount} for booking ${booking._id}`
          : `Dink court booking ${booking._id}`,
        successUrl: `${appUrl}/bookings/${booking._id}?paid=1`,
        cancelUrl: `${appUrl}/bookings/${booking._id}?cancelled=1`,
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
        await applyParticipantPaid(booking._id!, userId);
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
        split,
        amount,
        retry: Boolean(openPayment === undefined),
      });
      track("booking_payment_started", {
        userId,
        bookingId: booking._id,
        provider: provider.name,
        mode: checkout.mode,
        amount,
        split,
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

  async "bookings.cancelPolicy"() {
    return withMethodLog("bookings.cancelPolicy", this.userId, async () => {
      return cancelPolicyCopy();
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

      // P1-11: server-side cancel window.
      const decision = assertBookingCancellable(booking, isAdmin);
      const wasConfirmed = booking.status === "confirmed";

      await Bookings.updateAsync(bookingId, {
        $set: { status: "cancelled", updatedAt: new Date() },
      });
      await Payments.updateAsync(
        { bookingId, status: "pending" },
        { $set: { status: "void", updatedAt: new Date() } },
        { multi: true },
      );

      await notifyUser({
        userId: booking.creatorUserId,
        type: "booking.cancelled",
        title: "Booking cancelled",
        body: wasConfirmed
          ? `Your booking on ${booking.startsAt.toLocaleString()} was cancelled. Paid refunds (if any) are handled by support/admin.`
          : `Your unpaid booking hold for ${booking.startsAt.toLocaleString()} was cancelled. The slot is free again.`,
        entityType: "booking",
        entityId: bookingId,
      });

      await applyBookingReliability(bookingId, "cancelled", booking.status);

      logInfo("bookings.cancel.ok", {
        bookingId,
        reason: decision.reason,
        wasConfirmed,
      });
      track("booking_cancelled", { userId, bookingId, wasConfirmed });
      return await Bookings.findOneAsync(bookingId);
    });
  },

  /** P2-02: organizer invites an existing user to pay their share. */
  async "bookings.invite"(input: unknown) {
    return withMethodLog("bookings.invite", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(inviteToPaySchema, input, "invite");
      const booking = await Bookings.findOneAsync(body.bookingId);
      if (!booking) throw new Meteor.Error("not-found", "Booking not found");
      if (booking.creatorUserId !== userId) {
        throw new Meteor.Error("forbidden", "Only the organizer can invite payers");
      }
      if (!["pending_payment", "confirmed"].includes(booking.status)) {
        throw new Meteor.Error("invalid-state", "Cannot invite on this booking");
      }

      const invitee = await Accounts.findUserByEmail(body.email);
      if (!invitee?._id) {
        throw new Meteor.Error("not-found", "No Dink account for that email — they need to sign up first");
      }
      if (invitee.profile?.deletedAt || invitee.profile?.suspended) {
        throw new Meteor.Error("forbidden", "That account cannot join this booking");
      }

      const existing = await BookingParticipants.findOneAsync({
        bookingId: booking._id!,
        userId: invitee._id,
      });
      if (existing) {
        logInfo("bookings.invite.already", { bookingId: booking._id, userId: invitee._id });
        return { ok: true, already: true, participant: existing };
      }

      await BookingParticipants.insertAsync({
        bookingId: booking._id!,
        userId: invitee._id,
        role: "player",
        paymentShare: 0,
        paymentStatus: "pending",
      });
      await rebalanceShares(booking._id!);

      if (booking.status === "pending_payment") {
        await Bookings.updateAsync(booking._id!, {
          $set: { expiresAt: new Date(Date.now() + 15 * 60_000), updatedAt: new Date() },
        });
      }

      const appUrl = process.env.APP_URL || process.env.ROOT_WEB_URL || "http://localhost:3000";
      await notifyUser({
        userId: invitee._id,
        type: "booking.invite_to_pay",
        title: "You're invited to split a court",
        body: `Pay your share for ${booking.startsAt.toLocaleString()}. ${appUrl}/bookings/${booking._id}`,
        entityType: "booking",
        entityId: booking._id!,
      });
      logInfo("bookings.invite.ok", { bookingId: booking._id, inviteeId: invitee._id });
      track("invite_sent", { userId, bookingId: booking._id, inviteeId: invitee._id });
      return { ok: true, already: false };
    });
  },

  async "bookings.remindUnpaid"(input: unknown) {
    return withMethodLog("bookings.remindUnpaid", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(remindUnpaidSchema, input, "remind");
      const booking = await Bookings.findOneAsync(body.bookingId);
      if (!booking) throw new Meteor.Error("not-found", "Booking not found");
      if (booking.creatorUserId !== userId) {
        throw new Meteor.Error("forbidden", "Only the organizer can remind payers");
      }
      const unpaid = await BookingParticipants.find({
        bookingId: booking._id!,
        paymentStatus: { $ne: "paid" },
      }).fetchAsync();
      const appUrl = process.env.APP_URL || process.env.ROOT_WEB_URL || "http://localhost:3000";
      for (const p of unpaid) {
        if (p.userId === userId) continue;
        await notifyUser({
          userId: p.userId,
          type: "booking.pay_reminder",
          title: "Reminder: pay your court share",
          body: `Unpaid share ₱${p.paymentShare} for ${booking.startsAt.toLocaleString()}. ${appUrl}/bookings/${booking._id}`,
          entityType: "booking",
          entityId: booking._id!,
        });
      }
      logInfo("bookings.remindUnpaid.ok", {
        bookingId: booking._id,
        reminded: unpaid.filter((p) => p.userId !== userId).length,
      });
      return { ok: true, reminded: unpaid.filter((p) => p.userId !== userId).length };
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
