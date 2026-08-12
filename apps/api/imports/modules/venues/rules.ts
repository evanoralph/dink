import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import {
  AvailabilityRules,
  CourtBlackouts,
  Courts,
  PricingRules,
  VenueMemberships,
  Venues,
} from "../../collections";
import { requireUserId, userHasRole } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function requireVenueStaff(userId: string | null | undefined, venueId: string) {
  const uid = await requireUserId(userId);
  const isAdmin = await userHasRole(uid, "admin");
  if (isAdmin) return uid;

  const venue = await Venues.findOneAsync(venueId);
  if (!venue) throw new Meteor.Error("not-found", "Venue not found");

  const membership = await VenueMemberships.findOneAsync({ venueId, userId: uid });
  const isOwner = venue.ownerUserId === uid || membership?.role === "venue_owner";
  const isStaff = membership?.role === "venue_staff";
  if (!isOwner && !isStaff) {
    throw new Meteor.Error("forbidden", "Not a venue member");
  }
  return uid;
}

function assertTimeRange(startTime: string, endTime: string) {
  if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
    throw new Meteor.Error("invalid-time", "Times must be HH:mm (24h)");
  }
  if (startTime >= endTime) {
    throw new Meteor.Error("invalid-range", "startTime must be before endTime");
  }
}

async function assertCourtInVenue(courtId: string, venueId: string) {
  const court = await Courts.findOneAsync(courtId);
  if (!court || court.venueId !== venueId) {
    throw new Meteor.Error("not-found", "Court not found for venue");
  }
  return court;
}

Meteor.methods({
  // --- Availability (P1-12) ---
  async "venue.availabilityRules.list"(input: { venueId: string; courtId?: string }) {
    return withMethodLog("venue.availabilityRules.list", this.userId, async () => {
      check(input, { venueId: String, courtId: Match.Optional(String) });
      await requireVenueStaff(this.userId, input.venueId);
      const query: Record<string, unknown> = { venueId: input.venueId };
      if (input.courtId) query.courtId = input.courtId;
      const items = await AvailabilityRules.find(query, {
        sort: { courtId: 1, dayOfWeek: 1, startTime: 1 },
      }).fetchAsync();
      logInfo("venue.availabilityRules.list.ok", { venueId: input.venueId, count: items.length });
      return items;
    });
  },

  async "venue.availabilityRules.upsert"(input: {
    _id?: string;
    venueId: string;
    courtId: string;
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDurationMin: number;
  }) {
    return withMethodLog("venue.availabilityRules.upsert", this.userId, async () => {
      check(input, {
        _id: Match.Optional(String),
        venueId: String,
        courtId: String,
        dayOfWeek: Number,
        startTime: String,
        endTime: String,
        slotDurationMin: Number,
      });
      await requireVenueStaff(this.userId, input.venueId);
      await assertCourtInVenue(input.courtId, input.venueId);
      assertTimeRange(input.startTime, input.endTime);
      if (input.dayOfWeek < 0 || input.dayOfWeek > 6) {
        throw new Meteor.Error("invalid-day", "dayOfWeek must be 0–6");
      }
      if (input.slotDurationMin < 15 || input.slotDurationMin > 240) {
        throw new Meteor.Error("invalid-slot", "slotDurationMin must be 15–240");
      }

      const doc = {
        venueId: input.venueId,
        courtId: input.courtId,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        slotDurationMin: input.slotDurationMin,
      };

      if (input._id) {
        const existing = await AvailabilityRules.findOneAsync(input._id);
        if (!existing || existing.venueId !== input.venueId) {
          throw new Meteor.Error("not-found", "Availability rule not found");
        }
        await AvailabilityRules.updateAsync(input._id, { $set: doc });
        logInfo("venue.availabilityRules.updated", { ruleId: input._id });
        return await AvailabilityRules.findOneAsync(input._id);
      }

      const id = await AvailabilityRules.insertAsync(doc);
      logInfo("venue.availabilityRules.created", { ruleId: id, venueId: input.venueId });
      return await AvailabilityRules.findOneAsync(id);
    });
  },

  async "venue.availabilityRules.remove"(ruleId: string) {
    return withMethodLog("venue.availabilityRules.remove", this.userId, async () => {
      check(ruleId, String);
      const existing = await AvailabilityRules.findOneAsync(ruleId);
      if (!existing) throw new Meteor.Error("not-found", "Availability rule not found");
      await requireVenueStaff(this.userId, existing.venueId);
      await AvailabilityRules.removeAsync(ruleId);
      logInfo("venue.availabilityRules.removed", { ruleId });
      return { ok: true };
    });
  },

  // --- Pricing (P1-13) ---
  async "venue.pricingRules.list"(input: { venueId: string; courtId?: string }) {
    return withMethodLog("venue.pricingRules.list", this.userId, async () => {
      check(input, { venueId: String, courtId: Match.Optional(String) });
      await requireVenueStaff(this.userId, input.venueId);
      const query: Record<string, unknown> = { venueId: input.venueId };
      if (input.courtId) query.courtId = input.courtId;
      const items = await PricingRules.find(query, { sort: { pricingType: 1, startTime: 1 } }).fetchAsync();
      logInfo("venue.pricingRules.list.ok", { venueId: input.venueId, count: items.length });
      return items;
    });
  },

  async "venue.pricingRules.upsert"(input: {
    _id?: string;
    venueId: string;
    courtId?: string;
    days: number[];
    startTime: string;
    endTime: string;
    price: number;
    pricingType: "hourly" | "peak" | "offpeak";
  }) {
    return withMethodLog("venue.pricingRules.upsert", this.userId, async () => {
      check(input, {
        _id: Match.Optional(String),
        venueId: String,
        courtId: Match.Optional(String),
        days: [Number],
        startTime: String,
        endTime: String,
        price: Number,
        pricingType: String,
      });
      await requireVenueStaff(this.userId, input.venueId);
      if (input.courtId) await assertCourtInVenue(input.courtId, input.venueId);
      assertTimeRange(input.startTime, input.endTime);
      if (!input.days.length || input.days.some((d) => d < 0 || d > 6)) {
        throw new Meteor.Error("invalid-days", "days must be 0–6");
      }
      if (input.price < 0) throw new Meteor.Error("invalid-price", "price must be ≥ 0");
      if (!["hourly", "peak", "offpeak"].includes(input.pricingType)) {
        throw new Meteor.Error("invalid-type", "pricingType invalid");
      }

      const doc = {
        venueId: input.venueId,
        courtId: input.courtId,
        days: input.days,
        startTime: input.startTime,
        endTime: input.endTime,
        price: input.price,
        pricingType: input.pricingType as "hourly" | "peak" | "offpeak",
      };

      if (input._id) {
        const existing = await PricingRules.findOneAsync(input._id);
        if (!existing || existing.venueId !== input.venueId) {
          throw new Meteor.Error("not-found", "Pricing rule not found");
        }
        await PricingRules.updateAsync(input._id, { $set: doc });
        logInfo("venue.pricingRules.updated", { ruleId: input._id });
        return await PricingRules.findOneAsync(input._id);
      }

      const id = await PricingRules.insertAsync(doc);
      logInfo("venue.pricingRules.created", { ruleId: id, venueId: input.venueId });
      return await PricingRules.findOneAsync(id);
    });
  },

  async "venue.pricingRules.remove"(ruleId: string) {
    return withMethodLog("venue.pricingRules.remove", this.userId, async () => {
      check(ruleId, String);
      const existing = await PricingRules.findOneAsync(ruleId);
      if (!existing) throw new Meteor.Error("not-found", "Pricing rule not found");
      await requireVenueStaff(this.userId, existing.venueId);
      await PricingRules.removeAsync(ruleId);
      logInfo("venue.pricingRules.removed", { ruleId });
      return { ok: true };
    });
  },

  // --- Blackouts / block time (P1-15) ---
  async "venue.blackouts.list"(input: { venueId: string; from?: string; to?: string }) {
    return withMethodLog("venue.blackouts.list", this.userId, async () => {
      check(input, {
        venueId: String,
        from: Match.Optional(String),
        to: Match.Optional(String),
      });
      await requireVenueStaff(this.userId, input.venueId);
      const query: Record<string, unknown> = { venueId: input.venueId };
      if (input.from || input.to) {
        query.startsAt = {};
        if (input.from) (query.startsAt as Record<string, Date>).$gte = new Date(input.from);
        if (input.to) (query.startsAt as Record<string, Date>).$lte = new Date(input.to);
      }
      const items = await CourtBlackouts.find(query, { sort: { startsAt: 1 } }).fetchAsync();
      logInfo("venue.blackouts.list.ok", { venueId: input.venueId, count: items.length });
      return items;
    });
  },

  async "venue.blackouts.create"(input: {
    venueId: string;
    courtId: string;
    startsAt: string;
    endsAt: string;
    reason?: string;
  }) {
    return withMethodLog("venue.blackouts.create", this.userId, async () => {
      const uid = await requireVenueStaff(this.userId, input.venueId);
      check(input, {
        venueId: String,
        courtId: String,
        startsAt: String,
        endsAt: String,
        reason: Match.Optional(String),
      });
      await assertCourtInVenue(input.courtId, input.venueId);
      const startsAt = new Date(input.startsAt);
      const endsAt = new Date(input.endsAt);
      if (!(startsAt < endsAt)) {
        throw new Meteor.Error("invalid-range", "Invalid blackout range");
      }
      const id = await CourtBlackouts.insertAsync({
        venueId: input.venueId,
        courtId: input.courtId,
        startsAt,
        endsAt,
        reason: input.reason,
        createdBy: uid,
        createdAt: new Date(),
      });
      logInfo("venue.blackouts.created", { blackoutId: id, venueId: input.venueId });
      return await CourtBlackouts.findOneAsync(id);
    });
  },

  async "venue.blackouts.remove"(blackoutId: string) {
    return withMethodLog("venue.blackouts.remove", this.userId, async () => {
      check(blackoutId, String);
      const existing = await CourtBlackouts.findOneAsync(blackoutId);
      if (!existing) throw new Meteor.Error("not-found", "Blackout not found");
      await requireVenueStaff(this.userId, existing.venueId);
      await CourtBlackouts.removeAsync(blackoutId);
      logInfo("venue.blackouts.removed", { blackoutId });
      return { ok: true };
    });
  },
});
