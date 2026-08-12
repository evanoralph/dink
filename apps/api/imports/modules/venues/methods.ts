import { Accounts } from "meteor/accounts-base";
import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import {
  AvailabilityRules,
  Bookings,
  CourtBlackouts,
  Courts,
  Payments,
  PricingRules,
  VenueMemberships,
  Venues,
  type BookingStatus,
  type PricingRuleDoc,
} from "../../collections";
import {
  adminListMatcher,
  applyDateFilter,
  eachDayKeys,
  escapeRegex,
  parseDateRange,
  parsePage,
  type AdminListInput,
} from "../../lib/adminQuery";
import { requireRole, requireUserId, userHasRole } from "../../lib/auth";
import { track } from "../../lib/analytics";
import { withMethodLog, logInfo, logDebug } from "../../lib/logger";
import { runWithUserId } from "../../lib/requestContext";

const VENUE_BOOKING_STATUSES: BookingStatus[] = ["confirmed", "cancelled", "completed"];

function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) {
  return aStart < bEnd && bStart < aEnd;
}

async function getAccessibleVenues(userId: string) {
  const memberships = await VenueMemberships.find({ userId }).fetchAsync();
  const venueIds = memberships.map((m) => m.venueId);
  return Venues.find({
    $or: [{ _id: { $in: venueIds } }, { ownerUserId: userId }],
  }).fetchAsync();
}

export async function requireVenueAccess(
  userId: string | null | undefined,
  venueId: string,
  opts?: { ownerOnly?: boolean },
) {
  const uid = await requireUserId(userId);
  const isAdmin = await userHasRole(uid, "admin");
  if (isAdmin) return uid;

  const venue = await Venues.findOneAsync(venueId);
  if (!venue) throw new Meteor.Error("not-found", "Venue not found");

  const membership = await VenueMemberships.findOneAsync({ venueId, userId: uid });
  const isOwner = venue.ownerUserId === uid || membership?.role === "venue_owner";
  const isStaff = membership?.role === "venue_staff";

  if (opts?.ownerOnly) {
    if (!isOwner) throw new Meteor.Error("forbidden", "Owner access required");
    return uid;
  }

  if (!isOwner && !isStaff) {
    throw new Meteor.Error("forbidden", "Not a venue member");
  }
  return uid;
}

async function resolveVenueIds(userId: string, venueId?: string) {
  const isAdmin = await userHasRole(userId, "admin");
  if (venueId) {
    if (!isAdmin) {
      await requireVenueAccess(userId, venueId);
    } else {
      const venue = await Venues.findOneAsync(venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");
    }
    const venues = await getAccessibleVenues(userId);
    const selected = await Venues.findOneAsync(venueId);
    return {
      venues: selected ? [selected] : venues,
      ids: [venueId],
    };
  }

  if (isAdmin) {
    const venues = await Venues.find({}, { sort: { name: 1 } }).fetchAsync();
    return { venues, ids: venues.map((v) => v._id!) };
  }

  const venues = await getAccessibleVenues(userId);
  return { venues, ids: venues.map((v) => v._id!) };
}

type VenueListFilters = {
  city?: string;
  indoor?: boolean;
  covered?: boolean;
  airConditioned?: boolean;
  q?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
};

type VenueUpdateInput = {
  venueId: string;
  name?: string;
  city?: string;
  address?: string;
  indoor?: boolean;
  covered?: boolean;
  airConditioned?: boolean;
  description?: string;
  imageUrls?: string[];
  location?: { type: "Point"; coordinates: [number, number] } | null;
  lat?: number;
  lng?: number;
};

Meteor.methods({
  async "venues.list"(filters?: VenueListFilters) {
    return withMethodLog("venues.list", this.userId, async () => {
      check(
        filters,
        Match.Maybe({
          city: Match.Maybe(String),
          indoor: Match.Maybe(Boolean),
          covered: Match.Maybe(Boolean),
          airConditioned: Match.Maybe(Boolean),
          q: Match.Maybe(String),
          lat: Match.Maybe(Number),
          lng: Match.Maybe(Number),
          radiusKm: Match.Maybe(Number),
        }),
      );

      const query: Record<string, unknown> = { status: "approved" };
      if (filters?.city) query.city = filters.city;
      if (typeof filters?.indoor === "boolean") query.indoor = filters.indoor;
      if (typeof filters?.covered === "boolean") query.covered = filters.covered;
      if (typeof filters?.airConditioned === "boolean") {
        query.airConditioned = filters.airConditioned;
      }
      if (filters?.q?.trim()) {
        query.name = { $regex: escapeRegex(filters.q.trim()), $options: "i" };
      }

      const hasGeo =
        typeof filters?.lat === "number" &&
        typeof filters?.lng === "number" &&
        Number.isFinite(filters.lat) &&
        Number.isFinite(filters.lng);

      if (hasGeo) {
        const radiusKm =
          typeof filters?.radiusKm === "number" && filters.radiusKm > 0
            ? Math.min(filters.radiusKm, 100)
            : 10;
        logInfo("venues.list.nearby", {
          lat: filters!.lat,
          lng: filters!.lng,
          radiusKm,
          city: filters?.city,
          q: filters?.q,
        });

        const rows = await Venues.rawCollection()
          .aggregate([
            {
              $geoNear: {
                near: {
                  type: "Point",
                  coordinates: [filters!.lng!, filters!.lat!],
                },
                distanceField: "distanceMeters",
                maxDistance: radiusKm * 1000,
                spherical: true,
                query,
              },
            },
            { $limit: 100 },
          ])
          .toArray();

        const venues = rows.map((row) => {
          const { distanceMeters, ...venue } = row as Record<string, unknown> & {
            distanceMeters?: number;
          };
          return {
            ...venue,
            distanceKm:
              typeof distanceMeters === "number"
                ? Math.round((distanceMeters / 1000) * 10) / 10
                : undefined,
          };
        });
        logInfo("venues.list.result", { count: venues.length, mode: "nearby" });
        return venues;
      }

      const venues = await Venues.find(query, { sort: { name: 1 }, limit: 100 }).fetchAsync();
      logInfo("venues.list.result", { count: venues.length, mode: "filter" });
      return venues;
    });
  },

  async "venues.get"(venueId: string) {
    return withMethodLog("venues.get", this.userId, async () => {
      check(venueId, String);
      const venue = await Venues.findOneAsync(venueId);
      if (!venue || (venue.status !== "approved" && !(await userHasRole(this.userId || "", "admin")))) {
        throw new Meteor.Error("not-found", "Venue not found");
      }
      const courts = await Courts.find({ venueId, active: true }).fetchAsync();
      return { venue, courts };
    });
  },

  async "venues.create"(input: {
    name: string;
    city: string;
    address?: string;
    indoor?: boolean;
    covered?: boolean;
    airConditioned?: boolean;
    description?: string;
    imageUrls?: string[];
    location?: { type: "Point"; coordinates: [number, number] };
  }) {
    return withMethodLog("venues.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        name: String,
        city: String,
        address: Match.Optional(String),
        indoor: Match.Optional(Boolean),
        covered: Match.Optional(Boolean),
        airConditioned: Match.Optional(Boolean),
        description: Match.Optional(String),
        imageUrls: Match.Optional([String]),
        location: Match.Optional({
          type: String,
          coordinates: [Number],
        }),
      });

      const now = new Date();
      const venueId = await Venues.insertAsync({
        name: input.name,
        city: input.city,
        address: input.address,
        indoor: input.indoor,
        covered: input.covered,
        airConditioned: input.airConditioned,
        description: input.description,
        imageUrls: input.imageUrls,
        location: input.location,
        courtCount: 0,
        currency: "PHP",
        status: "pending",
        ownerUserId: userId,
        staffUserIds: [userId],
        ratingAvg: 0,
        ratingCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      await VenueMemberships.insertAsync({
        venueId,
        userId,
        role: "venue_owner",
        createdAt: now,
      });

      await Roles.createRoleAsync("venue_owner", { unlessExists: true });
      await Roles.addUsersToRolesAsync(userId, "venue_owner");
      logInfo("venues.create.role_granted", { venueId, userId, role: "venue_owner" });

      logInfo("venues.create.ok", { venueId, userId });
      track("venue_created", { userId, venueId, city: input.city });
      return await Venues.findOneAsync(venueId);
    });
  },

  async "venues.update"(input: VenueUpdateInput) {
    return withMethodLog("venues.update", this.userId, async () => {
      check(input, {
        venueId: String,
        name: Match.Optional(String),
        city: Match.Optional(String),
        address: Match.Optional(String),
        indoor: Match.Optional(Boolean),
        covered: Match.Optional(Boolean),
        airConditioned: Match.Optional(Boolean),
        description: Match.Optional(String),
        imageUrls: Match.Optional([String]),
        location: Match.Optional(
          Match.OneOf(null, {
            type: String,
            coordinates: [Number],
          }),
        ),
        lat: Match.Optional(Number),
        lng: Match.Optional(Number),
      });

      await requireVenueAccess(this.userId, input.venueId, { ownerOnly: true });

      const $set: Record<string, unknown> = { updatedAt: new Date() };
      const $unset: Record<string, string> = {};

      if (input.name !== undefined) $set.name = input.name;
      if (input.city !== undefined) $set.city = input.city;
      if (input.address !== undefined) $set.address = input.address;
      if (input.indoor !== undefined) $set.indoor = input.indoor;
      if (input.covered !== undefined) $set.covered = input.covered;
      if (input.airConditioned !== undefined) $set.airConditioned = input.airConditioned;
      if (input.description !== undefined) $set.description = input.description;
      if (input.imageUrls !== undefined) $set.imageUrls = input.imageUrls;

      if (input.location === null) {
        $unset.location = "";
      } else if (input.location) {
        $set.location = {
          type: "Point",
          coordinates: input.location.coordinates,
        };
      } else if (typeof input.lat === "number" && typeof input.lng === "number") {
        $set.location = {
          type: "Point",
          coordinates: [input.lng, input.lat],
        };
      }

      const modifier: Record<string, unknown> = { $set };
      if (Object.keys($unset).length) modifier.$unset = $unset;

      await Venues.updateAsync(input.venueId, modifier);
      logInfo("venues.update.ok", {
        venueId: input.venueId,
        fields: Object.keys($set).filter((k) => k !== "updatedAt"),
        clearedLocation: input.location === null,
      });
      return await Venues.findOneAsync(input.venueId);
    });
  },

  /** P2-07: apply default hours + hourly price to every court (wizard). */
  async "venues.applyOnboardDefaults"(input: {
    venueId: string;
    priceFrom?: number;
    startTime?: string;
    endTime?: string;
    slotDurationMin?: number;
  }) {
    return withMethodLog("venues.applyOnboardDefaults", this.userId, async () => {
      check(input, {
        venueId: String,
        priceFrom: Match.Optional(Number),
        startTime: Match.Optional(String),
        endTime: Match.Optional(String),
        slotDurationMin: Match.Optional(Number),
      });
      await requireVenueAccess(this.userId, input.venueId, { ownerOnly: true });
      const courts = await Courts.find({ venueId: input.venueId, active: true }).fetchAsync();
      if (!courts.length) {
        throw new Meteor.Error("invalid-state", "Add at least one court first");
      }
      const startTime = input.startTime || "06:00";
      const endTime = input.endTime || "22:00";
      const slotDurationMin = input.slotDurationMin || 60;
      const priceFrom = Math.max(0, Math.round(input.priceFrom ?? 500));
      let hoursAdded = 0;
      let pricesAdded = 0;

      for (const court of courts) {
        for (let day = 0; day < 7; day++) {
          const exists = await AvailabilityRules.findOneAsync({
            courtId: court._id,
            dayOfWeek: day,
          });
          if (exists) continue;
          await AvailabilityRules.insertAsync({
            courtId: court._id!,
            venueId: input.venueId,
            dayOfWeek: day,
            startTime,
            endTime,
            slotDurationMin,
          });
          hoursAdded += 1;
        }
        const priceExists = await PricingRules.findOneAsync({
          venueId: input.venueId,
          courtId: court._id,
        });
        if (!priceExists) {
          await PricingRules.insertAsync({
            venueId: input.venueId,
            courtId: court._id,
            days: [0, 1, 2, 3, 4, 5, 6],
            startTime,
            endTime,
            price: priceFrom,
            pricingType: "hourly",
          });
          pricesAdded += 1;
        }
      }

      await Venues.updateAsync(input.venueId, {
        $set: { priceFrom, courtCount: courts.length, updatedAt: new Date() },
      });
      logInfo("venues.applyOnboardDefaults.ok", {
        venueId: input.venueId,
        courts: courts.length,
        hoursAdded,
        pricesAdded,
        priceFrom,
      });
      return await Venues.findOneAsync(input.venueId);
    });
  },

  async "courts.create"(input: { venueId: string; name: string; surface?: string }) {
    return withMethodLog("courts.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { venueId: String, name: String, surface: Match.Optional(String) });
      const venue = await Venues.findOneAsync(input.venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");

      const isAdmin = await userHasRole(userId, "admin");
      const membership = await VenueMemberships.findOneAsync({
        venueId: input.venueId,
        userId,
      });
      if (!isAdmin && !membership) {
        throw new Meteor.Error("forbidden", "Not a venue member");
      }

      const courtId = await Courts.insertAsync({
        venueId: input.venueId,
        name: input.name,
        surface: input.surface,
        active: true,
        createdAt: new Date(),
      });
      await Venues.updateAsync(input.venueId, {
        $inc: { courtCount: 1 },
        $set: { updatedAt: new Date() },
      });
      logInfo("courts.create.ok", { venueId: input.venueId, courtId });
      return await Courts.findOneAsync(courtId);
    });
  },

  async "venues.availability"(input: { venueId: string; date: string }) {
    return withMethodLog("venues.availability", this.userId, async () => {
      check(input, { venueId: String, date: String });
      const venue = await Venues.findOneAsync(input.venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");

      const day = new Date(input.date);
      if (Number.isNaN(day.getTime())) {
        throw new Meteor.Error("invalid-date", "Invalid date");
      }
      const dayOfWeek = day.getUTCDay();
      const dayStart = new Date(`${input.date}T00:00:00.000Z`);
      const dayEnd = new Date(`${input.date}T23:59:59.999Z`);
      const courts = await Courts.find({ venueId: input.venueId, active: true }).fetchAsync();
      const bookings = await Bookings.find({
        venueId: input.venueId,
        status: { $in: ["pending_payment", "confirmed"] },
        startsAt: { $gte: dayStart, $lt: dayEnd },
      }).fetchAsync();

      // P1-15: owner blackouts hide slots from players.
      const blackouts = await CourtBlackouts.find({
        venueId: input.venueId,
        startsAt: { $lt: dayEnd },
        endsAt: { $gt: dayStart },
      }).fetchAsync();

      const pricingRules = await PricingRules.find({ venueId: input.venueId }).fetchAsync();

      const pickPrice = (courtId: string | undefined, slotStart: Date) => {
        const hh = String(slotStart.getUTCHours()).padStart(2, "0");
        const mm = String(slotStart.getUTCMinutes()).padStart(2, "0");
        const t = `${hh}:${mm}`;
        const matches = pricingRules.filter((p: PricingRuleDoc) => {
          const courtOk = !p.courtId || p.courtId === courtId;
          const dayOk = p.days.includes(dayOfWeek);
          const timeOk = p.startTime <= t && t < p.endTime;
          return courtOk && dayOk && timeOk;
        });
        // Prefer court-specific, then peak, then any.
        matches.sort((a, b) => {
          const courtScore = (x: PricingRuleDoc) => (x.courtId ? 0 : 1);
          const typeScore = (x: PricingRuleDoc) =>
            x.pricingType === "peak" ? 0 : x.pricingType === "hourly" ? 1 : 2;
          return courtScore(a) - courtScore(b) || typeScore(a) - typeScore(b);
        });
        return matches[0]?.price ?? venue.priceFrom ?? 0;
      };

      const slots = [];
      for (const court of courts) {
        const rules = await AvailabilityRules.find({
          courtId: court._id,
          dayOfWeek,
        }).fetchAsync();
        for (const rule of rules) {
          const [sh, sm] = rule.startTime.split(":").map(Number);
          const [eh, em] = rule.endTime.split(":").map(Number);
          let cursor = new Date(day);
          cursor.setUTCHours(sh, sm, 0, 0);
          const end = new Date(day);
          end.setUTCHours(eh, em, 0, 0);
          while (cursor < end) {
            const slotEnd = new Date(cursor.getTime() + rule.slotDurationMin * 60_000);
            if (slotEnd > end) break;
            const booked = bookings.some(
              (b) =>
                b.courtId === court._id &&
                overlaps(cursor, slotEnd, b.startsAt, b.endsAt),
            );
            const blocked = blackouts.some(
              (bl) =>
                bl.courtId === court._id &&
                overlaps(cursor, slotEnd, bl.startsAt, bl.endsAt),
            );
            // Blacked-out slots are omitted so they disappear for players.
            if (!blocked) {
              slots.push({
                courtId: court._id,
                courtName: court.name,
                startsAt: cursor.toISOString(),
                endsAt: slotEnd.toISOString(),
                available: !booked,
                price: pickPrice(court._id, cursor),
                currency: venue.currency,
              });
            }
            cursor = slotEnd;
          }
        }
      }
      logDebug("venues.availability.ok", {
        venueId: input.venueId,
        date: input.date,
        slots: slots.length,
        blackouts: blackouts.length,
      });
      return { venueId: input.venueId, date: input.date, slots };
    });
  },

  async "venue.dashboard"(input: AdminListInput = {}) {
    return withMethodLog("venue.dashboard", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(input, adminListMatcher);
      const days = Math.min(90, Math.max(7, Number(input.days) || 30));
      const to = input.to ? new Date(input.to) : new Date();
      const from = input.from
        ? new Date(input.from)
        : new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      from.setUTCHours(0, 0, 0, 0);

      const { venues, ids } = await resolveVenueIds(userId, input.venueId);
      if (!ids.length) {
        logInfo("venue.dashboard.empty", { userId });
        return {
          venues: [],
          from: from.toISOString(),
          to: to.toISOString(),
          stats: { bookingsToday: 0, unpaid: 0, revenueToday: 0 },
          kpis: {
            revenueConfirmed: 0,
            gmv: 0,
            bookingsTotal: 0,
            bookingsConfirmed: 0,
            bookingsPendingPayment: 0,
            bookingsCancelled: 0,
            unpaidPayments: 0,
            courtsActive: 0,
            courtsTotal: 0,
          },
          series: [],
          recentBookings: [],
          unpaidBookings: [],
        };
      }

      const venueFilter = { venueId: { $in: ids } };
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [
        bookingsTotal,
        bookingsConfirmed,
        bookingsPendingPayment,
        bookingsCancelled,
        courtsActive,
        courtsTotal,
        todayBookings,
        confirmedInRange,
        recentBookings,
        unpaidBookings,
      ] = await Promise.all([
        Bookings.find(venueFilter).countAsync(),
        Bookings.find({ ...venueFilter, status: "confirmed" }).countAsync(),
        Bookings.find({ ...venueFilter, status: "pending_payment" }).countAsync(),
        Bookings.find({ ...venueFilter, status: "cancelled" }).countAsync(),
        Courts.find({ ...venueFilter, active: true }).countAsync(),
        Courts.find(venueFilter).countAsync(),
        Bookings.find({ ...venueFilter, startsAt: { $gte: todayStart } }).fetchAsync(),
        Bookings.find({
          ...venueFilter,
          status: "confirmed",
          startsAt: { $gte: from, $lte: to },
        }).fetchAsync(),
        Bookings.find(venueFilter, { sort: { createdAt: -1 }, limit: 8 }).fetchAsync(),
        Bookings.find(
          { ...venueFilter, status: "pending_payment" },
          { sort: { createdAt: -1 }, limit: 8 },
        ).fetchAsync(),
      ]);

      const bookingIds = (
        await Bookings.find(venueFilter, { fields: { _id: 1 } }).fetchAsync()
      ).map((b) => b._id!);
      const paidPayments = bookingIds.length
        ? await Payments.find({ bookingId: { $in: bookingIds }, status: "paid" }).fetchAsync()
        : [];
      const unpaidPayments = bookingIds.length
        ? await Payments.find({ bookingId: { $in: bookingIds }, status: "pending" }).countAsync()
        : 0;
      const gmv = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const revenueConfirmed = confirmedInRange.reduce((s, b) => s + (b.total || 0), 0);

      const unpaidToday = todayBookings.filter((b) => b.status === "pending_payment").length;
      const revenueToday = todayBookings
        .filter((b) => b.status === "confirmed")
        .reduce((s, b) => s + b.total, 0);

      const bookingSeriesRaw = await Bookings.rawCollection()
        .aggregate([
          { $match: { venueId: { $in: ids }, createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
              revenue: { $sum: "$total" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const paymentSeriesRaw = bookingIds.length
        ? await Payments.rawCollection()
            .aggregate([
              {
                $match: {
                  bookingId: { $in: bookingIds },
                  status: "paid",
                  createdAt: { $gte: from, $lte: to },
                },
              },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  gmv: { $sum: "$amount" },
                  count: { $sum: 1 },
                },
              },
              { $sort: { _id: 1 } },
            ])
            .toArray()
        : [];

      const bookingMap = new Map(bookingSeriesRaw.map((r) => [r._id as string, r]));
      const paymentMap = new Map(paymentSeriesRaw.map((r) => [r._id as string, r]));
      const series = eachDayKeys(from, to).map((key) => ({
        date: key,
        bookings: Number(bookingMap.get(key)?.count || 0),
        bookingRevenue: Number(bookingMap.get(key)?.revenue || 0),
        gmv: Number(paymentMap.get(key)?.gmv || 0),
        paidCount: Number(paymentMap.get(key)?.count || 0),
      }));

      logDebug("venue.dashboard.ok", {
        venues: venues.length,
        bookingsTotal,
        days,
      });

      return {
        venues,
        from: from.toISOString(),
        to: to.toISOString(),
        stats: {
          bookingsToday: todayBookings.length,
          unpaid: unpaidToday,
          revenueToday,
        },
        kpis: {
          revenueConfirmed,
          gmv,
          bookingsTotal,
          bookingsConfirmed,
          bookingsPendingPayment,
          bookingsCancelled,
          unpaidPayments,
          courtsActive,
          courtsTotal,
        },
        series,
        recentBookings,
        unpaidBookings,
      };
    });
  },

  async "venue.calendar"(input?: { venueId?: string; from?: string; to?: string }) {
    return withMethodLog("venue.calendar", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(
        input,
        Match.Optional({
          venueId: Match.Optional(String),
          from: Match.Optional(String),
          to: Match.Optional(String),
        }),
      );
      const { ids } = await resolveVenueIds(userId, input?.venueId);
      const query: Record<string, unknown> = {
        venueId: { $in: ids },
        status: { $in: ["pending_payment", "confirmed", "completed"] },
      };
      if (input?.from || input?.to) {
        query.startsAt = {};
        if (input.from) (query.startsAt as Record<string, Date>).$gte = new Date(input.from);
        if (input.to) (query.startsAt as Record<string, Date>).$lte = new Date(input.to);
      }
      const items = await Bookings.find(query, { sort: { startsAt: 1 } }).fetchAsync();
      logInfo("venue.calendar.ok", { count: items.length });
      return items;
    });
  },

  async "venue.courts.list"(input: AdminListInput = {}) {
    return withMethodLog("venue.courts.list", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { ids } = await resolveVenueIds(userId, input.venueId);
      const query: Record<string, unknown> = { venueId: { $in: ids } };
      if (input.active === "true" || input.active === true) query.active = true;
      if (input.active === "false" || input.active === false) query.active = false;
      if (input.q) query.name = new RegExp(escapeRegex(input.q), "i");
      const total = await Courts.find(query).countAsync();
      const items = await Courts.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      logInfo("venue.courts.list.ok", { total, page });
      return { items, total, page, pageSize };
    });
  },

  async "venue.courts.setActive"(input: { courtId: string; active: boolean }) {
    return withMethodLog("venue.courts.setActive", this.userId, async () => {
      check(input, { courtId: String, active: Boolean });
      const court = await Courts.findOneAsync(input.courtId);
      if (!court) throw new Meteor.Error("not-found", "Court not found");
      await requireVenueAccess(this.userId, court.venueId);
      await Courts.updateAsync(input.courtId, { $set: { active: input.active } });
      logInfo("venue.courts.setActive", input);
      return await Courts.findOneAsync(input.courtId);
    });
  },

  async "venue.bookings.list"(input: AdminListInput = {}) {
    return withMethodLog("venue.bookings.list", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const { ids } = await resolveVenueIds(userId, input.venueId);
      const query: Record<string, unknown> = { venueId: { $in: ids } };
      if (input.status) query.status = input.status;
      if (input.courtId) query.courtId = input.courtId;
      applyDateFilter(query, "startsAt", from, to);
      if (input.q) query._id = new RegExp(escapeRegex(input.q), "i");
      const total = await Bookings.find(query).countAsync();
      const items = await Bookings.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      logInfo("venue.bookings.list.ok", { total, page });
      return { items, total, page, pageSize };
    });
  },

  async "venue.bookings.setStatus"(input: { bookingId: string; status: BookingStatus }) {
    return withMethodLog("venue.bookings.setStatus", this.userId, async () => {
      check(input, { bookingId: String, status: String });
      if (!VENUE_BOOKING_STATUSES.includes(input.status)) {
        throw new Meteor.Error("invalid-status", "Status not allowed for venue ops");
      }
      const before = await Bookings.findOneAsync(input.bookingId);
      if (!before) throw new Meteor.Error("not-found", "Booking not found");
      await requireVenueAccess(this.userId, before.venueId);
      if (
        input.status === "completed" &&
        before.endsAt > new Date() &&
        before.status !== "confirmed"
      ) {
        throw new Meteor.Error(
          "invalid-state",
          "Complete only confirmed bookings, or wait until the booking end time",
        );
      }
      await Bookings.updateAsync(input.bookingId, {
        $set: { status: input.status, updatedAt: new Date() },
      });
      const { applyBookingReliability } = await import("../../lib/reliability");
      await applyBookingReliability(input.bookingId, input.status, before.status);
      logInfo("venue.bookings.setStatus", input);
      return await Bookings.findOneAsync(input.bookingId);
    });
  },

  async "venue.payments.list"(input: AdminListInput = {}) {
    return withMethodLog("venue.payments.list", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const { ids } = await resolveVenueIds(userId, input.venueId);
      const bookingIds = ids.length
        ? (
            await Bookings.find({ venueId: { $in: ids } }, { fields: { _id: 1 } }).fetchAsync()
          ).map((b) => b._id!)
        : [];
      if (!bookingIds.length) {
        logInfo("venue.payments.list.ok", { total: 0, page, empty: true });
        return { items: [], total: 0, page, pageSize };
      }
      const query: Record<string, unknown> = { bookingId: { $in: bookingIds } };
      if (input.status) query.status = input.status;
      applyDateFilter(query, "createdAt", from, to);
      const total = await Payments.find(query).countAsync();
      const items = await Payments.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      logInfo("venue.payments.list.ok", { total, page });
      return { items, total, page, pageSize };
    });
  },

  async "venue.reports.summary"(input: AdminListInput = {}) {
    return withMethodLog("venue.reports.summary", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      check(input, adminListMatcher);
      const { from: fromParsed, to: toParsed } = parseDateRange(input);
      const to = toParsed || new Date();
      const from = fromParsed || new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
      const { ids, venues } = await resolveVenueIds(userId, input.venueId);

      const bookingsInRange = ids.length
        ? await Bookings.find({
            venueId: { $in: ids },
            createdAt: { $gte: from, $lte: to },
          }).fetchAsync()
        : [];
      const confirmed = bookingsInRange.filter((b) => b.status === "confirmed").length;
      const cancelled = bookingsInRange.filter((b) => b.status === "cancelled").length;
      const conversion =
        bookingsInRange.length > 0 ? confirmed / bookingsInRange.length : 0;

      const bookingIds = bookingsInRange.map((b) => b._id!);
      const paid = bookingIds.length
        ? await Payments.find({
            bookingId: { $in: bookingIds },
            status: "paid",
            createdAt: { $gte: from, $lte: to },
          }).fetchAsync()
        : [];
      const refunded = bookingIds.length
        ? await Payments.find({
            bookingId: { $in: bookingIds },
            status: "refunded",
            createdAt: { $gte: from, $lte: to },
          }).fetchAsync()
        : [];
      const gmv = paid.reduce((s, p) => s + p.amount, 0);
      const refundedAmount = refunded.reduce((s, p) => s + p.amount, 0);

      const byStatusMap = new Map<string, number>();
      for (const b of bookingsInRange) {
        byStatusMap.set(b.status, (byStatusMap.get(b.status) || 0) + 1);
      }

      const seriesRaw = ids.length
        ? await Bookings.rawCollection()
            .aggregate([
              {
                $match: {
                  venueId: { $in: ids },
                  createdAt: { $gte: from, $lte: to },
                },
              },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  bookings: { $sum: 1 },
                  revenue: { $sum: "$total" },
                },
              },
              { $sort: { _id: 1 } },
            ])
            .toArray()
        : [];

      const seriesMap = new Map(seriesRaw.map((r) => [r._id as string, r]));
      const series = eachDayKeys(from, to).map((key) => ({
        date: key,
        bookings: Number(seriesMap.get(key)?.bookings || 0),
        revenue: Number(seriesMap.get(key)?.revenue || 0),
      }));

      const confirmedStarts = ids.length
        ? await Bookings.find({
            venueId: { $in: ids },
            status: "confirmed",
            startsAt: { $gte: from, $lte: to },
          }).fetchAsync()
        : [];
      const bookedHours = confirmedStarts.reduce(
        (s, b) => s + Math.max(0, (b.endsAt.getTime() - b.startsAt.getTime()) / 3_600_000),
        0,
      );
      const courts = ids.length
        ? await Courts.find({ venueId: { $in: ids }, active: true }).fetchAsync()
        : [];
      const rules = ids.length
        ? await AvailabilityRules.find({ venueId: { $in: ids } }).fetchAsync()
        : [];
      let availableHours = 0;
      for (const key of eachDayKeys(from, to)) {
        const dow = new Date(`${key}T00:00:00.000Z`).getUTCDay();
        for (const court of courts) {
          const rule = rules.find((r) => r.courtId === court._id && r.dayOfWeek === dow);
          if (!rule) continue;
          const [sh, sm] = rule.startTime.split(":").map(Number);
          const [eh, em] = rule.endTime.split(":").map(Number);
          availableHours += Math.max(0, eh + em / 60 - (sh + sm / 60));
        }
      }
      const hourCounts = new Map<number, number>();
      for (const b of confirmedStarts) {
        const h = b.startsAt.getUTCHours();
        hourCounts.set(h, (hourCounts.get(h) || 0) + 1);
      }
      let peakHour = 0;
      let peakCount = 0;
      for (const [h, c] of hourCounts) {
        if (c > peakCount) {
          peakHour = h;
          peakCount = c;
        }
      }
      const utilizationPct =
        availableHours > 0 ? Math.round((bookedHours / availableHours) * 1000) / 10 : 0;

      logInfo("venue.reports.summary.ok", {
        bookings: bookingsInRange.length,
        gmv,
        venues: venues.length,
        utilizationPct,
        peakHour,
      });

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        totals: {
          bookingsCreated: bookingsInRange.length,
          confirmed,
          cancelled,
          conversion,
          gmv,
          refundedAmount,
          revenueConfirmed: bookingsInRange
            .filter((b) => b.status === "confirmed")
            .reduce((s, b) => s + (b.total || 0), 0),
          bookedHours: Math.round(bookedHours * 10) / 10,
          availableHours: Math.round(availableHours * 10) / 10,
          utilizationPct,
          peakHour,
          peakCount,
        },
        byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({
          status,
          count,
        })),
        series,
      };
    });
  },

  async "venue.reports.export"(input: AdminListInput = {}) {
    return withMethodLog("venue.reports.export", this.userId, async () => {
      const userId = await requireRole(this.userId, ["venue_owner", "venue_staff", "admin"]);
      const summary = await runWithUserId(userId, () =>
        Meteor.callAsync("venue.reports.summary", input),
      ) as {
        from: string;
        to: string;
        totals: Record<string, number>;
        series: Array<{ date: string; bookings: number; revenue: number }>;
      };
      const lines = [
        "metric,value",
        `from,${summary.from}`,
        `to,${summary.to}`,
        `bookingsCreated,${summary.totals.bookingsCreated}`,
        `confirmed,${summary.totals.confirmed}`,
        `cancelled,${summary.totals.cancelled}`,
        `gmv,${summary.totals.gmv}`,
        `revenueConfirmed,${summary.totals.revenueConfirmed}`,
        `bookedHours,${summary.totals.bookedHours}`,
        `availableHours,${summary.totals.availableHours}`,
        `utilizationPct,${summary.totals.utilizationPct}`,
        `peakHourUtc,${summary.totals.peakHour}`,
        "",
        "date,bookings,revenue",
        ...summary.series.map((r: { date: string; bookings: number; revenue: number }) => `${r.date},${r.bookings},${r.revenue}`),
      ];
      const csv = lines.join("\n");
      logInfo("venue.reports.export.ok", { rows: summary.series.length });
      return { csv, filename: `venue-report-${summary.from.slice(0, 10)}.csv`, summary };
    });
  },

  async "venue.staff.list"(venueId: string) {
    return withMethodLog("venue.staff.list", this.userId, async () => {
      await requireRole(this.userId, ["venue_owner", "admin"]);
      check(venueId, String);
      await requireVenueAccess(this.userId, venueId, { ownerOnly: true });
      const memberships = await VenueMemberships.find({ venueId }).fetchAsync();
      const users = await Meteor.users
        .find({ _id: { $in: memberships.map((m) => m.userId) } })
        .fetchAsync();
      const byId = new Map(users.map((u) => [u._id!, u]));
      const items = memberships.map((m) => {
        const u = byId.get(m.userId);
        return {
          _id: `${m.venueId}-${m.userId}`,
          venueId: m.venueId,
          userId: m.userId,
          role: m.role,
          email: u?.emails?.[0]?.address || "",
          displayName: u?.profile?.displayName || "User",
          createdAt: m.createdAt,
        };
      });
      logInfo("venue.staff.list.ok", { venueId, count: items.length });
      return items;
    });
  },

  async "venue.staff.add"(input: { venueId: string; userEmail: string }) {
    return withMethodLog("venue.staff.add", this.userId, async () => {
      await requireRole(this.userId, ["venue_owner", "admin"]);
      check(input, { venueId: String, userEmail: String });
      await requireVenueAccess(this.userId, input.venueId, { ownerOnly: true });
      const user = await Accounts.findUserByEmail(input.userEmail);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      await VenueMemberships.upsertAsync(
        { venueId: input.venueId, userId: user._id! },
        {
          $setOnInsert: {
            venueId: input.venueId,
            userId: user._id!,
            role: "venue_staff",
            createdAt: new Date(),
          },
        },
      );
      await Venues.updateAsync(input.venueId, { $addToSet: { staffUserIds: user._id! } });
      await Roles.addUsersToRolesAsync(user._id!, "venue_staff");
      logInfo("venue.staff.add.ok", { venueId: input.venueId, userId: user._id });
      return { ok: true, userId: user._id };
    });
  },

  async "venue.staff.remove"(input: { venueId: string; userId: string }) {
    return withMethodLog("venue.staff.remove", this.userId, async () => {
      await requireRole(this.userId, ["venue_owner", "admin"]);
      check(input, { venueId: String, userId: String });
      await requireVenueAccess(this.userId, input.venueId, { ownerOnly: true });
      const venue = await Venues.findOneAsync(input.venueId);
      if (!venue) throw new Meteor.Error("not-found", "Venue not found");
      if (venue.ownerUserId === input.userId) {
        throw new Meteor.Error("invalid-state", "Cannot remove the venue owner");
      }
      const membership = await VenueMemberships.findOneAsync({
        venueId: input.venueId,
        userId: input.userId,
      });
      if (!membership) throw new Meteor.Error("not-found", "Membership not found");
      if (membership.role === "venue_owner") {
        throw new Meteor.Error("invalid-state", "Cannot remove a venue owner membership");
      }
      await VenueMemberships.removeAsync({ venueId: input.venueId, userId: input.userId });
      await Venues.updateAsync(input.venueId, { $pull: { staffUserIds: input.userId } });
      logInfo("venue.staff.remove.ok", input);
      return { ok: true };
    });
  },
});
