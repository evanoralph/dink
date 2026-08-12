import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Payments, VenuePacks, VenuePasses, Venues } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { requireVenueAccess } from "../venues/methods";

Meteor.methods({
  async "packs.list"(venueId: string) {
    return withMethodLog("packs.list", this.userId, async () => {
      check(venueId, String);
      const packs = await VenuePacks.find({ venueId, active: true }, { sort: { price: 1 } }).fetchAsync();
      logInfo("packs.list.ok", { venueId, count: packs.length });
      return packs;
    });
  },

  async "packs.create"(input: {
    venueId: string;
    name: string;
    price: number;
    discountPct: number;
    durationDays: number;
    visitsIncluded?: number;
  }) {
    return withMethodLog("packs.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        venueId: String,
        name: String,
        price: Number,
        discountPct: Number,
        durationDays: Number,
        visitsIncluded: Match.Optional(Number),
      });
      await requireVenueAccess(userId, input.venueId, { ownerOnly: true });
      const venue = await Venues.findOneAsync(input.venueId);
      const id = await VenuePacks.insertAsync({
        venueId: input.venueId,
        name: input.name.trim(),
        price: Math.max(0, Math.round(input.price)),
        currency: venue?.currency || "PHP",
        discountPct: Math.min(90, Math.max(0, Math.round(input.discountPct))),
        durationDays: Math.max(1, Math.round(input.durationDays)),
        visitsIncluded:
          typeof input.visitsIncluded === "number" ? Math.max(1, Math.round(input.visitsIncluded)) : undefined,
        active: true,
        createdAt: new Date(),
      });
      logInfo("packs.create.ok", { packId: id, venueId: input.venueId, userId });
      track("venue_pack_created", { userId, venueId: input.venueId, packId: id });
      return await VenuePacks.findOneAsync(id);
    });
  },

  async "packs.buy"(packId: string) {
    return withMethodLog("packs.buy", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(packId, String);
      const pack = await VenuePacks.findOneAsync(packId);
      if (!pack || !pack.active) throw new Meteor.Error("not-found", "Pack not found");
      const provider = process.env.PAYMENT_PROVIDER || "stub";
      const paymentStatus = provider === "stub" || pack.price <= 0 ? "paid" : "pending";
      const paymentId = await Payments.insertAsync({
        packId,
        userId,
        provider,
        amount: pack.price,
        currency: pack.currency,
        status: paymentStatus,
        createdAt: new Date(),
        updatedAt: new Date(),
        metadata: { kind: "venue_pack", venueId: pack.venueId },
      });
      if (paymentStatus !== "paid") {
        logInfo("packs.buy.pending", { packId, userId, paymentId });
        return { paymentId, status: "pending", pass: null };
      }
      const expiresAt = new Date(Date.now() + pack.durationDays * 24 * 60 * 60 * 1000);
      const passId = await VenuePasses.insertAsync({
        venueId: pack.venueId,
        userId,
        packId,
        expiresAt,
        remainingVisits: pack.visitsIncluded,
        status: "active",
        createdAt: new Date(),
      });
      logInfo("packs.buy.ok", { packId, userId, passId, discountPct: pack.discountPct });
      track("venue_pack_purchased", { userId, packId, venueId: pack.venueId });
      return { paymentId, status: "paid", pass: await VenuePasses.findOneAsync(passId) };
    });
  },

  async "packs.mine"() {
    return withMethodLog("packs.mine", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const now = new Date();
      const expired = await VenuePasses.find({
        userId,
        status: "active",
        expiresAt: { $lt: now },
      }).fetchAsync();
      for (const p of expired) {
        if (p._id) await VenuePasses.updateAsync(p._id, { $set: { status: "expired" } });
      }
      const passes = await VenuePasses.find({ userId }, { sort: { createdAt: -1 }, limit: 20 }).fetchAsync();
      const packIds = [...new Set(passes.map((p) => p.packId))];
      const packs = packIds.length ? await VenuePacks.find({ _id: { $in: packIds } }).fetchAsync() : [];
      const byId = new Map(packs.map((p) => [p._id!, p]));
      logInfo("packs.mine.ok", { userId, count: passes.length });
      return passes.map((p) => ({ ...p, pack: byId.get(p.packId) || null }));
    });
  },
});
