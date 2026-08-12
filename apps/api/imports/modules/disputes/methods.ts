import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { MatchDisputes, Matches } from "../../collections";
import { requireRole, requireUserId } from "../../lib/auth";
import { writeAdminAudit } from "../../lib/adminAudit";
import { reverseMatchRatings } from "../../lib/rating";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import {
  adminListMatcher,
  parsePage,
  type AdminListInput,
} from "../../lib/adminQuery";

Meteor.methods({
  async "matches.dispute"(input: { matchId: string; reason: string }) {
    return withMethodLog("matches.dispute", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { matchId: String, reason: String });
      const match = await Matches.findOneAsync(input.matchId);
      if (!match) throw new Meteor.Error("not-found", "Match not found");
      const participants = [...match.team1UserIds, ...match.team2UserIds];
      if (!participants.includes(userId)) throw new Meteor.Error("forbidden", "Not a participant");
      const reason = input.reason.trim();
      if (reason.length < 3) throw new Meteor.Error("invalid-body", "Reason required");
      const existing = await MatchDisputes.findOneAsync({ matchId: input.matchId, reporterUserId: userId, status: "open" });
      if (existing) return existing;
      const id = await MatchDisputes.insertAsync({
        matchId: input.matchId,
        reporterUserId: userId,
        reason,
        status: "open",
        createdAt: new Date(),
      });
      await Matches.updateAsync(input.matchId, { $set: { disputed: true } });
      logInfo("matches.dispute.ok", { disputeId: id, matchId: input.matchId, userId });
      track("match_disputed", { userId, matchId: input.matchId });
      return await MatchDisputes.findOneAsync(id);
    });
  },

  async "admin.disputes.list"(input: AdminListInput = {}) {
    return withMethodLog("admin.disputes.list", this.userId, async () => {
      await requireRole(this.userId, ["admin"]);
      check(input, adminListMatcher);
      const { page, pageSize, skip } = parsePage(input);
      const query: Record<string, unknown> = {};
      if (input.status) query.status = input.status;
      const total = await MatchDisputes.find(query).countAsync();
      const items = await MatchDisputes.find(query, {
        sort: { createdAt: -1 },
        skip,
        limit: pageSize,
      }).fetchAsync();
      logInfo("admin.disputes.list.ok", { total, page });
      return { items, total, page, pageSize };
    });
  },

  async "admin.disputes.resolve"(input: {
    disputeId: string;
    action: "dismiss" | "void_ratings";
    note?: string;
  }) {
    return withMethodLog("admin.disputes.resolve", this.userId, async () => {
      const adminId = await requireRole(this.userId, ["admin"]);
      check(input, {
        disputeId: String,
        action: String,
        note: Match.Optional(String),
      });
      const row = await MatchDisputes.findOneAsync(input.disputeId);
      if (!row) throw new Meteor.Error("not-found", "Dispute not found");
      if (row.status !== "open") throw new Meteor.Error("invalid-state", "Already resolved");
      if (input.action === "void_ratings") {
        await reverseMatchRatings(row.matchId);
      }
      const status = input.action === "void_ratings" ? "voided" : "dismissed";
      await MatchDisputes.updateAsync(input.disputeId, {
        $set: {
          status,
          note: input.note?.trim(),
          resolvedBy: adminId,
          resolvedAt: new Date(),
        },
      });
      await writeAdminAudit({
        actorUserId: adminId,
        action: `dispute.${input.action}`,
        entityType: "match_dispute",
        entityId: input.disputeId,
        before: { status: row.status },
        after: { status },
      });
      logInfo("admin.disputes.resolve.ok", { disputeId: input.disputeId, action: input.action });
      return await MatchDisputes.findOneAsync(input.disputeId);
    });
  },
});
