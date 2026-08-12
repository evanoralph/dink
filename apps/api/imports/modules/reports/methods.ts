import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Reports, VenueReviews, Venues } from "../../collections";
import { writeAdminAudit } from "../../lib/adminAudit";
import { requireRole, requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { parseBody } from "../../lib/validate";
import { createReportSchema } from "../../lib/zodSchemas";
import { adminListMatcher, parsePage, type AdminListInput } from "../../lib/adminQuery";

Meteor.methods({
  async "reports.create"(input: unknown) {
    return withMethodLog("reports.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(createReportSchema, input, "report");
      const reportId = await Reports.insertAsync({
        reporterUserId: userId,
        targetType: body.targetType,
        targetId: body.targetId,
        reason: body.reason,
        details: body.details,
        status: "open",
        createdAt: new Date(),
      });
      logInfo("reports.create.ok", {
        reportId,
        targetType: body.targetType,
        targetId: body.targetId,
      });
      return await Reports.findOneAsync(reportId);
    });
  },

  async "admin.moderation.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.moderation.list", this.userId, async () => {
      await requireRole(this.userId, "admin");
      check(input, adminListMatcher);
      const { page, pageSize, skip, sortDir } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      if (input.q) query.reason = { $regex: input.q, $options: "i" };
      const total = await Reports.find(query).countAsync();
      const items = await Reports.find(query, {
        sort: { createdAt: sortDir },
        skip,
        limit: pageSize,
      }).fetchAsync();
      logInfo("admin.moderation.list.ok", { total, page });
      return { items, total, page, pageSize };
    });
  },

  async "admin.moderation.resolve"(input: {
    reportId: string;
    status: "actioned" | "dismissed";
    action?: "hide_review" | "suspend_user" | "suspend_venue";
  }) {
    return withMethodLog("admin.moderation.resolve", this.userId, async () => {
      const actorId = await requireRole(this.userId, "admin");
      check(input, {
        reportId: String,
        status: String,
        action: Match.Optional(String),
      });
      const report = await Reports.findOneAsync(input.reportId);
      if (!report) throw new Meteor.Error("not-found", "Report not found");

      if (input.action === "hide_review" && report.targetType === "review") {
        await VenueReviews.updateAsync(report.targetId, { $set: { hidden: true } });
        const review = await VenueReviews.findOneAsync(report.targetId);
        if (review) {
          const visible = await VenueReviews.find({
            venueId: review.venueId,
            hidden: { $ne: true },
          }).fetchAsync();
          const ratingCount = visible.length;
          const ratingAvg =
            ratingCount === 0
              ? 0
              : Math.round(
                  (visible.reduce((sum, r) => sum + r.rating, 0) / ratingCount) * 10,
                ) / 10;
          await Venues.updateAsync(review.venueId, {
            $set: { ratingAvg, ratingCount, updatedAt: new Date() },
          });
        }
        logInfo("admin.moderation.hide_review", { reviewId: report.targetId });
      }

      if (input.action === "suspend_user" && report.targetType === "user") {
        await Meteor.users.updateAsync(report.targetId, {
          $set: {
            "profile.suspended": true,
            "services.resume.loginTokens": [],
          },
        });
        logInfo("admin.moderation.suspend_user", { userId: report.targetId });
      }

      if (input.action === "suspend_venue" && report.targetType === "venue") {
        await Venues.updateAsync(report.targetId, {
          $set: { status: "suspended", updatedAt: new Date() },
        });
        logInfo("admin.moderation.suspend_venue", { venueId: report.targetId });
      }

      await Reports.updateAsync(input.reportId, {
        $set: {
          status: input.status,
          action: input.action,
          resolvedAt: new Date(),
          resolvedBy: actorId,
        },
      });
      await writeAdminAudit({
        actorUserId: actorId,
        action: "moderation.resolve",
        entityType: "report",
        entityId: input.reportId,
        before: { status: report.status },
        after: { status: input.status, action: input.action },
      });
      logInfo("admin.moderation.resolve.ok", {
        reportId: input.reportId,
        status: input.status,
        action: input.action,
      });
      return await Reports.findOneAsync(input.reportId);
    });
  },
});
