import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { LadderChallenges, LadderEntries, Ladders } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";
import { notifyUser } from "../notifications/service";

Meteor.methods({
  async "ladders.list"(filters?: { city?: string }) {
    return withMethodLog("ladders.list", this.userId, async () => {
      const query: Record<string, unknown> = {};
      if (filters?.city) query.city = filters.city;
      const rows = await Ladders.find(query, { sort: { createdAt: -1 }, limit: 50 }).fetchAsync();
      logInfo("ladders.list.ok", { count: rows.length });
      return rows;
    });
  },

  async "ladders.create"(input: { name: string; city: string }) {
    return withMethodLog("ladders.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { name: String, city: String });
      const id = await Ladders.insertAsync({
        name: input.name.trim(),
        city: input.city.trim(),
        creatorUserId: userId,
        createdAt: new Date(),
      });
      await LadderEntries.insertAsync({
        ladderId: id,
        userId,
        rank: 1,
        wins: 0,
        losses: 0,
        joinedAt: new Date(),
      });
      logInfo("ladders.create.ok", { ladderId: id, userId });
      track("ladder_created", { userId, ladderId: id });
      return await Ladders.findOneAsync(id);
    });
  },

  async "ladders.get"(ladderId: string) {
    return withMethodLog("ladders.get", this.userId, async () => {
      check(ladderId, String);
      const ladder = await Ladders.findOneAsync(ladderId);
      if (!ladder) throw new Meteor.Error("not-found", "Ladder not found");
      const entries = await LadderEntries.find({ ladderId }, { sort: { rank: 1 } }).fetchAsync();
      const challenges = await LadderChallenges.find(
        { ladderId, status: { $in: ["pending", "accepted"] } },
        { sort: { createdAt: -1 }, limit: 30 },
      ).fetchAsync();
      const names = await displayNames([
        ...entries.map((e) => e.userId),
        ...challenges.flatMap((c) => [c.challengerId, c.defenderId]),
      ]);
      const mine = this.userId ? entries.find((e) => e.userId === this.userId) : undefined;
      logInfo("ladders.get.ok", { ladderId, entries: entries.length });
      return {
        ladder,
        entries: entries.map((e) => ({ ...e, displayName: names.get(e.userId) || "Player" })),
        challenges: challenges.map((c) => ({
          ...c,
          challengerName: names.get(c.challengerId) || "Player",
          defenderName: names.get(c.defenderId) || "Player",
        })),
        membership: mine || null,
      };
    });
  },

  async "ladders.join"(ladderId: string) {
    return withMethodLog("ladders.join", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(ladderId, String);
      const ladder = await Ladders.findOneAsync(ladderId);
      if (!ladder) throw new Meteor.Error("not-found", "Ladder not found");
      const existing = await LadderEntries.findOneAsync({ ladderId, userId });
      if (existing) return ladder;
      const last = await LadderEntries.findOneAsync({ ladderId }, { sort: { rank: -1 } });
      await LadderEntries.insertAsync({
        ladderId,
        userId,
        rank: (last?.rank || 0) + 1,
        wins: 0,
        losses: 0,
        joinedAt: new Date(),
      });
      logInfo("ladders.join.ok", { ladderId, userId, rank: (last?.rank || 0) + 1 });
      track("ladder_joined", { userId, ladderId });
      return await Ladders.findOneAsync(ladderId);
    });
  },

  async "ladders.challenge"(input: { ladderId: string; defenderId: string }) {
    return withMethodLog("ladders.challenge", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { ladderId: String, defenderId: String });
      if (input.defenderId === userId) throw new Meteor.Error("invalid-body", "Cannot challenge yourself");
      const me = await LadderEntries.findOneAsync({ ladderId: input.ladderId, userId });
      const them = await LadderEntries.findOneAsync({ ladderId: input.ladderId, userId: input.defenderId });
      if (!me || !them) throw new Meteor.Error("forbidden", "Both players must be on the ladder");
      if (them.rank >= me.rank) throw new Meteor.Error("invalid-challenge", "Challenge someone ranked above you");
      if (me.rank - them.rank > 3) {
        throw new Meteor.Error("invalid-challenge", "Can only challenge up to 3 ranks above");
      }
      const open = await LadderChallenges.findOneAsync({
        ladderId: input.ladderId,
        challengerId: userId,
        status: { $in: ["pending", "accepted"] },
      });
      if (open) throw new Meteor.Error("exists", "You already have an open challenge");
      const id = await LadderChallenges.insertAsync({
        ladderId: input.ladderId,
        challengerId: userId,
        defenderId: input.defenderId,
        status: "pending",
        createdAt: new Date(),
      });
      await notifyUser({
        userId: input.defenderId,
        type: "ladder.challenge",
        title: "Ladder challenge",
        body: "Someone challenged your ladder rank.",
        entityType: "ladder",
        entityId: input.ladderId,
      });
      logInfo("ladders.challenge.ok", { challengeId: id, userId, defenderId: input.defenderId });
      track("ladder_challenge", { userId, ladderId: input.ladderId });
      return await LadderChallenges.findOneAsync(id);
    });
  },

  async "ladders.respond"(input: { challengeId: string; status: "accepted" | "declined" }) {
    return withMethodLog("ladders.respond", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { challengeId: String, status: String });
      const row = await LadderChallenges.findOneAsync(input.challengeId);
      if (!row || row.defenderId !== userId) throw new Meteor.Error("forbidden", "Not your challenge");
      if (row.status !== "pending") throw new Meteor.Error("invalid-state", "Already resolved");
      await LadderChallenges.updateAsync(input.challengeId, { $set: { status: input.status } });
      logInfo("ladders.respond.ok", { challengeId: input.challengeId, status: input.status });
      return await LadderChallenges.findOneAsync(input.challengeId);
    });
  },

  async "ladders.recordResult"(input: { challengeId: string; challengerSets: number; defenderSets: number }) {
    return withMethodLog("ladders.recordResult", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { challengeId: String, challengerSets: Number, defenderSets: Number });
      const row = await LadderChallenges.findOneAsync(input.challengeId);
      if (!row || row.status !== "accepted") throw new Meteor.Error("invalid-state", "Challenge not accepted");
      if (row.challengerId !== userId && row.defenderId !== userId) {
        throw new Meteor.Error("forbidden", "Not in this challenge");
      }
      const cSets = Math.max(0, Math.round(input.challengerSets));
      const dSets = Math.max(0, Math.round(input.defenderSets));
      const challengerWon = cSets > dSets;
      const me = await LadderEntries.findOneAsync({ ladderId: row.ladderId, userId: row.challengerId });
      const them = await LadderEntries.findOneAsync({ ladderId: row.ladderId, userId: row.defenderId });
      if (!me || !them) throw new Meteor.Error("not-found", "Ladder entries missing");
      if (challengerWon) {
        const challengerRank = me.rank;
        const defenderRank = them.rank;
        await LadderEntries.updateAsync(me._id!, { $set: { rank: defenderRank }, $inc: { wins: 1 } });
        await LadderEntries.updateAsync(them._id!, { $set: { rank: challengerRank }, $inc: { losses: 1 } });
      } else {
        await LadderEntries.updateAsync(me._id!, { $inc: { losses: 1 } });
        await LadderEntries.updateAsync(them._id!, { $inc: { wins: 1 } });
      }
      await LadderChallenges.updateAsync(input.challengeId, {
        $set: {
          status: "completed",
          team1Sets: cSets,
          team2Sets: dSets,
          resolvedAt: new Date(),
        },
      });
      logInfo("ladders.recordResult.ok", {
        challengeId: input.challengeId,
        challengerWon,
        cSets,
        dSets,
      });
      track("ladder_result", { userId, challengeId: input.challengeId, challengerWon });
      return await Meteor.callAsync("ladders.get", row.ladderId);
    });
  },
});
