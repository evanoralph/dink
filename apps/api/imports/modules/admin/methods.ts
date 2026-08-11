import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Roles } from "meteor/alanning:roles";
import {
  AdminAuditLogs,
  BookingParticipants,
  Bookings,
  Courts,
  FeatureFlags,
  Games,
  Matches,
  Notifications,
  Payments,
  Venues,
  type BookingStatus,
  type PaymentStatus,
} from "../../collections";
import { writeAdminAudit } from "../../lib/adminAudit";
import {
  adminListMatcher,
  applyDateFilter,
  dayKey,
  eachDayKeys,
  escapeRegex,
  parseDateRange,
  parsePage,
  toCsv,
  type AdminListInput,
} from "../../lib/adminQuery";
import { getUserRoles, publicUser, requireRole } from "../../lib/auth";
import { ROLES } from "../../lib/roles";
import { withMethodLog, logInfo, logDebug } from "../../lib/logger";

const BOOKING_ADMIN_STATUSES: BookingStatus[] = [
  "cancelled",
  "completed",
  "expired",
  "confirmed",
  "pending_payment",
];

async function requireAdmin(userId: string | null | undefined) {
  return requireRole(userId, "admin");
}

function boolFrom(value: string | boolean | undefined) {
  if (value === undefined || value === "") return undefined;
  if (typeof value === "boolean") return value;
  return value === "true" || value === "1";
}

Meteor.methods({
  async "admin.dashboard.stats"(input: AdminListInput = {}) {
    return withMethodLog("admin.dashboard.stats", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const days = Math.min(90, Math.max(7, Number(input.days) || 30));
      const to = input.to ? new Date(input.to) : new Date();
      const from = input.from
        ? new Date(input.from)
        : new Date(to.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
      from.setUTCHours(0, 0, 0, 0);

      const [
        usersTotal,
        venuesPending,
        venuesApproved,
        venuesSuspended,
        courtsActive,
        courtsTotal,
        bookingsTotal,
        bookingsConfirmed,
        bookingsCancelled,
        bookingsPendingPayment,
        unpaidPayments,
        paidPayments,
        refundedPayments,
        recentBookings,
        pendingVenues,
      ] = await Promise.all([
        Meteor.users.find({}).countAsync(),
        Venues.find({ status: "pending" }).countAsync(),
        Venues.find({ status: "approved" }).countAsync(),
        Venues.find({ status: "suspended" }).countAsync(),
        Courts.find({ active: true }).countAsync(),
        Courts.find({}).countAsync(),
        Bookings.find({}).countAsync(),
        Bookings.find({ status: "confirmed" }).countAsync(),
        Bookings.find({ status: "cancelled" }).countAsync(),
        Bookings.find({ status: "pending_payment" }).countAsync(),
        Payments.find({ status: "pending" }).countAsync(),
        Payments.find({ status: "paid" }).fetchAsync(),
        Payments.find({ status: "refunded" }).fetchAsync(),
        Bookings.find({}, { sort: { createdAt: -1 }, limit: 8 }).fetchAsync(),
        Venues.find({ status: "pending" }, { sort: { createdAt: -1 }, limit: 8 }).fetchAsync(),
      ]);

      const gmv = paidPayments.reduce((s, p) => s + (p.amount || 0), 0);
      const refundedAmount = refundedPayments.reduce((s, p) => s + (p.amount || 0), 0);

      const bookingSeriesRaw = await Bookings.rawCollection()
        .aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
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

      const paymentSeriesRaw = await Payments.rawCollection()
        .aggregate([
          { $match: { status: "paid", createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              gmv: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      const bookingMap = new Map(bookingSeriesRaw.map((r) => [r._id as string, r]));
      const paymentMap = new Map(paymentSeriesRaw.map((r) => [r._id as string, r]));
      const series = eachDayKeys(from, to).map((key) => ({
        date: key,
        bookings: Number(bookingMap.get(key)?.count || 0),
        bookingRevenue: Number(bookingMap.get(key)?.revenue || 0),
        gmv: Number(paymentMap.get(key)?.gmv || 0),
        paidCount: Number(paymentMap.get(key)?.count || 0),
      }));

      logDebug("admin.dashboard.stats.ok", { days, usersTotal, bookingsTotal });
      return {
        from: from.toISOString(),
        to: to.toISOString(),
        kpis: {
          usersTotal,
          venuesPending,
          venuesApproved,
          venuesSuspended,
          courtsActive,
          courtsTotal,
          bookingsTotal,
          bookingsConfirmed,
          bookingsCancelled,
          bookingsPendingPayment,
          unpaidPayments,
          gmv,
          refundedAmount,
        },
        series,
        recentBookings,
        pendingVenues,
      };
    });
  },

  async "admin.reports.summary"(input: AdminListInput = {}) {
    return withMethodLog("admin.reports.summary", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { from: fromParsed, to: toParsed } = parseDateRange(input);
      const to = toParsed || new Date();
      const from =
        fromParsed || new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);

      const createdUsers = await Meteor.users
        .find({ createdAt: { $gte: from, $lte: to } } as Record<string, unknown>)
        .countAsync();

      const bookingsInRange = await Bookings.find({
        createdAt: { $gte: from, $lte: to },
      }).fetchAsync();
      const confirmed = bookingsInRange.filter((b) => b.status === "confirmed").length;
      const cancelled = bookingsInRange.filter((b) => b.status === "cancelled").length;
      const conversion =
        bookingsInRange.length > 0 ? confirmed / bookingsInRange.length : 0;

      const paid = await Payments.find({
        status: "paid",
        createdAt: { $gte: from, $lte: to },
      }).fetchAsync();
      const refunded = await Payments.find({
        status: "refunded",
        createdAt: { $gte: from, $lte: to },
      }).fetchAsync();
      const gmv = paid.reduce((s, p) => s + p.amount, 0);
      const refundedAmount = refunded.reduce((s, p) => s + p.amount, 0);

      const byStatusMap = new Map<string, number>();
      for (const b of bookingsInRange) {
        byStatusMap.set(b.status, (byStatusMap.get(b.status) || 0) + 1);
      }

      const venueAgg = new Map<string, { venueId: string; count: number; revenue: number }>();
      for (const b of bookingsInRange) {
        const cur = venueAgg.get(b.venueId) || { venueId: b.venueId, count: 0, revenue: 0 };
        cur.count += 1;
        cur.revenue += b.total || 0;
        venueAgg.set(b.venueId, cur);
      }
      const venueIds = Array.from(venueAgg.keys());
      const venues = await Venues.find({ _id: { $in: venueIds } }).fetchAsync();
      const venueName = new Map(venues.map((v) => [v._id!, v.name]));
      const cityOf = new Map(venues.map((v) => [v._id!, v.city]));

      const topVenues = Array.from(venueAgg.values())
        .map((v) => ({
          ...v,
          name: venueName.get(v.venueId) || v.venueId,
          city: cityOf.get(v.venueId) || "",
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10);

      const cityMap = new Map<string, { city: string; count: number; revenue: number }>();
      for (const [venueId, stats] of venueAgg) {
        const city = cityOf.get(venueId) || "Unknown";
        const cur = cityMap.get(city) || { city, count: 0, revenue: 0 };
        cur.count += stats.count;
        cur.revenue += stats.revenue;
        cityMap.set(city, cur);
      }

      const seriesRaw = await Bookings.rawCollection()
        .aggregate([
          { $match: { createdAt: { $gte: from, $lte: to } } },
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              bookings: { $sum: 1 },
              revenue: { $sum: "$total" },
            },
          },
          { $sort: { _id: 1 } },
        ])
        .toArray();

      logInfo("admin.reports.summary.ok", {
        from: dayKey(from),
        to: dayKey(to),
        bookings: bookingsInRange.length,
        gmv,
      });

      return {
        from: from.toISOString(),
        to: to.toISOString(),
        totals: {
          newUsers: createdUsers,
          bookingsCreated: bookingsInRange.length,
          confirmed,
          cancelled,
          conversion,
          gmv,
          refundedAmount,
        },
        byStatus: Array.from(byStatusMap.entries()).map(([status, count]) => ({
          status,
          count,
        })),
        topVenues,
        topCities: Array.from(cityMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10),
        series: seriesRaw.map((r) => ({
          date: r._id as string,
          bookings: r.bookings as number,
          revenue: r.revenue as number,
        })),
      };
    });
  },

  async "admin.users.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.users.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.q) {
        const re = new RegExp(escapeRegex(input.q), "i");
        query.$or = [
          { "emails.address": re },
          { "profile.displayName": re },
        ];
      }
      if (input.city) {
        query["profile.city"] = new RegExp(escapeRegex(input.city), "i");
      }

      if (input.role) {
        const roleCursor = await Roles.getUsersInRoleAsync(input.role);
        const roleUsers = await roleCursor.fetchAsync();
        const userIdsFilter = roleUsers.map((u) => u._id!).filter(Boolean);
        if (!userIdsFilter.length) {
          return { items: [], total: 0, page, pageSize };
        }
        query._id = { $in: userIdsFilter };
      }

      const total = await Meteor.users.find(query).countAsync();
      const users = await Meteor.users
        .find(query, { sort: { createdAt: -1 }, skip, limit: pageSize })
        .fetchAsync();
      const items = [];
      for (const user of users) {
        const roles = await getUserRoles(user._id!);
        items.push(publicUser(user, roles));
      }
      logDebug("admin.users.list.ok", { total, page, pageSize });
      return { items, total, page, pageSize };
    });
  },

  async "admin.users.setRoles"(input: { userId: string; roles: string[] }) {
    return withMethodLog("admin.users.setRoles", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { userId: String, roles: [String] });
      const allowed = new Set<string>(ROLES as unknown as string[]);
      const nextRoles = Array.from(new Set(input.roles.filter((r) => allowed.has(r))));
      if (!nextRoles.length) {
        throw new Meteor.Error("invalid-roles", "At least one valid role required");
      }
      const before = await getUserRoles(input.userId);
      for (const role of nextRoles) {
        await Roles.createRoleAsync(role, { unlessExists: true });
      }
      await Roles.setUserRolesAsync(input.userId, nextRoles);
      const after = await getUserRoles(input.userId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "users.setRoles",
        entityType: "user",
        entityId: input.userId,
        before: { roles: before },
        after: { roles: after },
      });
      logInfo("admin.users.setRoles", { userId: input.userId, roles: after });
      const user = await Meteor.users.findOneAsync(input.userId);
      if (!user) throw new Meteor.Error("not-found", "User not found");
      return publicUser(user, after);
    });
  },

  async "admin.grantRole"(input: { userId: string; role: string }) {
    return withMethodLog("admin.grantRole", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { userId: String, role: String });
      const before = await getUserRoles(input.userId);
      await Roles.createRoleAsync(input.role, { unlessExists: true });
      await Roles.addUsersToRolesAsync(input.userId, input.role);
      const after = await getUserRoles(input.userId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "users.grantRole",
        entityType: "user",
        entityId: input.userId,
        before: { roles: before },
        after: { roles: after },
      });
      return { ok: true, roles: after };
    });
  },

  async "admin.venues.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.venues.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.city) query.city = new RegExp(escapeRegex(input.city), "i");
      if (input.q) {
        const re = new RegExp(escapeRegex(input.q), "i");
        query.$or = [{ name: re }, { city: re }, { address: re }];
      }
      const total = await Venues.find(query).countAsync();
      const items = await Venues.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.venues.setStatus"(input: {
    venueId: string;
    status: "pending" | "approved" | "rejected" | "suspended";
  }) {
    return withMethodLog("admin.venues.setStatus", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { venueId: String, status: String });
      const before = await Venues.findOneAsync(input.venueId);
      if (!before) throw new Meteor.Error("not-found", "Venue not found");
      await Venues.updateAsync(input.venueId, {
        $set: { status: input.status, updatedAt: new Date() },
      });
      const after = await Venues.findOneAsync(input.venueId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "venues.setStatus",
        entityType: "venue",
        entityId: input.venueId,
        before: { status: before.status },
        after: { status: after?.status },
      });
      logInfo("admin.venue.status", input);
      return after;
    });
  },

  async "admin.courts.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.courts.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.venueId) query.venueId = input.venueId;
      const active = boolFrom(input.active);
      if (active !== undefined) query.active = active;
      if (input.q) query.name = new RegExp(escapeRegex(input.q), "i");
      const total = await Courts.find(query).countAsync();
      const items = await Courts.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      const venueIds = Array.from(new Set(items.map((c) => c.venueId)));
      const venues = await Venues.find({ _id: { $in: venueIds } }).fetchAsync();
      const venueMap = new Map(venues.map((v) => [v._id!, v]));
      return {
        items: items.map((c) => ({
          ...c,
          venueName: venueMap.get(c.venueId)?.name,
          venueCity: venueMap.get(c.venueId)?.city,
        })),
        total,
        page,
        pageSize,
      };
    });
  },

  async "admin.courts.setActive"(input: { courtId: string; active: boolean }) {
    return withMethodLog("admin.courts.setActive", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { courtId: String, active: Boolean });
      const before = await Courts.findOneAsync(input.courtId);
      if (!before) throw new Meteor.Error("not-found", "Court not found");
      await Courts.updateAsync(input.courtId, { $set: { active: input.active } });
      const after = await Courts.findOneAsync(input.courtId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "courts.setActive",
        entityType: "court",
        entityId: input.courtId,
        before: { active: before.active },
        after: { active: after?.active },
      });
      logInfo("admin.courts.setActive", input);
      return after;
    });
  },

  async "admin.bookings.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.bookings.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.venueId) query.venueId = input.venueId;
      if (input.courtId) query.courtId = input.courtId;
      if (input.userId) query.creatorUserId = input.userId;
      applyDateFilter(query, "startsAt", from, to);
      if (input.q) {
        query._id = new RegExp(escapeRegex(input.q), "i");
      }
      const total = await Bookings.find(query).countAsync();
      const items = await Bookings.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.bookings.setStatus"(input: { bookingId: string; status: BookingStatus }) {
    return withMethodLog("admin.bookings.setStatus", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { bookingId: String, status: String });
      if (!BOOKING_ADMIN_STATUSES.includes(input.status)) {
        throw new Meteor.Error("invalid-status", "Status not allowed for admin");
      }
      const before = await Bookings.findOneAsync(input.bookingId);
      if (!before) throw new Meteor.Error("not-found", "Booking not found");
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
      const after = await Bookings.findOneAsync(input.bookingId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "bookings.setStatus",
        entityType: "booking",
        entityId: input.bookingId,
        before: { status: before.status },
        after: { status: after?.status },
      });
      logInfo("admin.bookings.setStatus", input);
      return after;
    });
  },

  async "admin.payments.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.payments.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.userId) query.userId = input.userId;
      applyDateFilter(query, "createdAt", from, to);

      if (input.venueId) {
        const bookingIds = (
          await Bookings.find({ venueId: input.venueId }, { fields: { _id: 1 } }).fetchAsync()
        ).map((b) => b._id!);
        query.bookingId = { $in: bookingIds };
      }

      const total = await Payments.find(query).countAsync();
      const items = await Payments.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.payments.setStatus"(input: {
    paymentId: string;
    status: "refunded" | "void" | "paid" | "failed";
  }) {
    return withMethodLog("admin.payments.setStatus", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { paymentId: String, status: String });
      const before = await Payments.findOneAsync(input.paymentId);
      if (!before) throw new Meteor.Error("not-found", "Payment not found");

      if (input.status === "refunded" && before.status !== "paid") {
        throw new Meteor.Error("invalid-state", "Only paid payments can be refunded");
      }
      if (input.status === "void" && before.status !== "pending") {
        throw new Meteor.Error("invalid-state", "Only pending payments can be voided");
      }

      // P1-05: call PayMongo refund API when refunding a live/sandbox pay_… payment.
      let providerRefundId: string | undefined;
      if (input.status === "refunded" && before.provider === "paymongo") {
        const { refundPaymongoPayment } = await import("../payments/providers/refunds");
        const payId =
          before.providerPaymentId?.startsWith("pay_")
            ? before.providerPaymentId
            : typeof before.metadata?.paymongoPaymentId === "string"
              ? before.metadata.paymongoPaymentId
              : null;
        if (!payId) {
          throw new Meteor.Error(
            "invalid-state",
            "No PayMongo pay_… id on this payment yet. Wait for paid webhook, then refund.",
          );
        }
        const refund = await refundPaymongoPayment({
          providerPaymentId: payId,
          amount: before.amount,
          reason: "requested_by_customer",
          notes: `Dink admin refund by ${actorId}`,
        });
        providerRefundId = refund.id;
      }

      const next = input.status as PaymentStatus;
      await Payments.updateAsync(input.paymentId, {
        $set: {
          status: next,
          updatedAt: new Date(),
          ...(providerRefundId
            ? { metadata: { ...(before.metadata || {}), providerRefundId } }
            : {}),
        },
      });
      if (input.status === "refunded") {
        await Bookings.updateAsync(before.bookingId, {
          $set: { status: "cancelled", updatedAt: new Date() },
        });
        await BookingParticipants.updateAsync(
          { bookingId: before.bookingId },
          { $set: { paymentStatus: "refunded" } },
          { multi: true },
        );
      }
      if (input.status === "void") {
        await Bookings.updateAsync(before.bookingId, {
          $set: { status: "cancelled", updatedAt: new Date() },
        });
      }
      const after = await Payments.findOneAsync(input.paymentId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "payments.setStatus",
        entityType: "payment",
        entityId: input.paymentId,
        before: { status: before.status, provider: before.provider },
        after: { status: after?.status, providerRefundId: providerRefundId || null },
      });
      logInfo("admin.payments.setStatus", { ...input, providerRefundId: providerRefundId || null });
      return after;
    });
  },

  async "admin.games.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.games.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.venueId) query.venueId = input.venueId;
      applyDateFilter(query, "startsAt", from, to);
      const total = await Games.find(query).countAsync();
      const items = await Games.find(query, {
        sort: { startsAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.games.setStatus"(input: { gameId: string; status: "cancelled" | "completed" | "open" }) {
    return withMethodLog("admin.games.setStatus", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, { gameId: String, status: String });
      const before = await Games.findOneAsync(input.gameId);
      if (!before) throw new Meteor.Error("not-found", "Game not found");
      await Games.updateAsync(input.gameId, { $set: { status: input.status } });
      const after = await Games.findOneAsync(input.gameId);
      await writeAdminAudit({
        actorUserId: actorId,
        action: "games.setStatus",
        entityType: "game",
        entityId: input.gameId,
        before: { status: before.status },
        after: { status: after?.status },
      });
      logInfo("admin.games.setStatus", input);
      return after;
    });
  },

  async "admin.matches.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.matches.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.gameId) query.gameId = input.gameId;
      applyDateFilter(query, "createdAt", from, to);
      const total = await Matches.find(query).countAsync();
      const items = await Matches.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.notifications.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.notifications.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.userId) query.userId = input.userId;
      if (input.type) query.type = input.type;
      const read = boolFrom(input.read);
      if (read !== undefined) query.read = read;
      const total = await Notifications.find(query).countAsync();
      const items = await Notifications.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.audit.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.audit.list", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const { from, to } = parseDateRange(input);
      const query: Record<string, unknown> = {};
      if (input.actorUserId) query.actorUserId = input.actorUserId;
      if (input.action) query.action = new RegExp(escapeRegex(input.action), "i");
      applyDateFilter(query, "createdAt", from, to);
      const total = await AdminAuditLogs.find(query).countAsync();
      const items = await AdminAuditLogs.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      return { items, total, page, pageSize };
    });
  },

  async "admin.featureFlags.list"() {
    return withMethodLog("admin.featureFlags.list", this.userId, async () => {
      await requireAdmin(this.userId);
      return FeatureFlags.find({}).fetchAsync();
    });
  },

  async "admin.featureFlags.set"(input: { key: string; enabled: boolean; description?: string }) {
    return withMethodLog("admin.featureFlags.set", this.userId, async () => {
      const actorId = await requireAdmin(this.userId);
      check(input, {
        key: String,
        enabled: Boolean,
        description: Match.Optional(String),
      });
      const before = await FeatureFlags.findOneAsync({ key: input.key });
      await FeatureFlags.upsertAsync(
        { key: input.key },
        {
          $set: {
            key: input.key,
            enabled: input.enabled,
            description: input.description,
            updatedAt: new Date(),
          },
        },
      );
      const after = await FeatureFlags.findOneAsync({ key: input.key });
      await writeAdminAudit({
        actorUserId: actorId,
        action: "featureFlags.set",
        entityType: "featureFlag",
        entityId: input.key,
        before: before ? { enabled: before.enabled } : null,
        after: { enabled: after?.enabled },
      });
      return after;
    });
  },

  async "admin.export.csv"(input: AdminListInput & { entity: string }) {
    return withMethodLog("admin.export.csv", this.userId, async () => {
      await requireAdmin(this.userId);
      check(input, { ...adminListMatcher, entity: String });
      const entity = input.entity;
      const limit = 1000;
      let rows: Record<string, unknown>[] = [];

      if (entity === "users") {
        const users = await Meteor.users.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
        for (const user of users) {
          const roles = await getUserRoles(user._id!);
          const pub = publicUser(user, roles);
          rows.push({
            id: pub._id,
            email: pub.email,
            displayName: pub.profile.displayName,
            city: pub.profile.city,
            roles: roles.join("|"),
          });
        }
      } else if (entity === "venues") {
        rows = await Venues.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "courts") {
        rows = await Courts.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "bookings") {
        rows = await Bookings.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "payments") {
        rows = await Payments.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "games") {
        rows = await Games.find({}, { limit, sort: { startsAt: -1 } }).fetchAsync();
      } else if (entity === "matches") {
        rows = await Matches.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "notifications") {
        rows = await Notifications.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "audit") {
        rows = await AdminAuditLogs.find({}, { limit, sort: { createdAt: -1 } }).fetchAsync();
      } else if (entity === "report") {
        const { from: fromParsed, to: toParsed } = parseDateRange(input);
        const to = toParsed || new Date();
        const from = fromParsed || new Date(to.getTime() - 29 * 24 * 60 * 60 * 1000);
        const bookingsInRange = await Bookings.find({
          createdAt: { $gte: from, $lte: to },
        }).fetchAsync();
        const paid = await Payments.find({
          status: "paid",
          createdAt: { $gte: from, $lte: to },
        }).fetchAsync();
        rows = [
          {
            section: "totals",
            bookingsCreated: bookingsInRange.length,
            confirmed: bookingsInRange.filter((b) => b.status === "confirmed").length,
            gmv: paid.reduce((s, p) => s + p.amount, 0),
          },
        ];
      } else {
        throw new Meteor.Error("invalid-entity", "Unknown export entity");
      }

      const csv = toCsv(
        rows.map((row) => {
          const out: Record<string, unknown> = {};
          for (const [k, v] of Object.entries(row)) {
            out[k] = v instanceof Date ? v.toISOString() : v;
          }
          return out;
        }),
      );
      logInfo("admin.export.csv", { entity, rows: rows.length });
      return { csv, filename: `dink-admin-${entity}-${dayKey(new Date())}.csv` };
    });
  },
});
