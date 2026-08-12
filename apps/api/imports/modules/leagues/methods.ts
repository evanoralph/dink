import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { LeagueMembers, LeagueResults, Leagues } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";

Meteor.methods({
  async "leagues.list"(filters?: { city?: string }) {
    return withMethodLog("leagues.list", this.userId, async () => {
      check(filters, Match.Maybe({ city: Match.Maybe(String) }));
      const query: Record<string, unknown> = {};
      if (filters?.city) query.city = filters.city;
      const rows = await Leagues.find(query, { sort: { createdAt: -1 }, limit: 50 }).fetchAsync();
      logInfo("leagues.list.ok", { count: rows.length });
      return rows;
    });
  },

  async "leagues.create"(input: { name: string; city: string; seasonName?: string; format?: "singles" | "doubles" }) {
    return withMethodLog("leagues.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        name: String,
        city: String,
        seasonName: Match.Optional(String),
        format: Match.Optional(String),
      });
      const format = input.format === "singles" ? "singles" : "doubles";
      const id = await Leagues.insertAsync({
        name: input.name.trim(),
        city: input.city.trim(),
        seasonName: (input.seasonName || "Season 1").trim(),
        format,
        status: "open",
        creatorUserId: userId,
        createdAt: new Date(),
      });
      await LeagueMembers.insertAsync({
        leagueId: id,
        userId,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        joinedAt: new Date(),
      });
      logInfo("leagues.create.ok", { leagueId: id, userId });
      track("league_created", { userId, leagueId: id });
      return await Leagues.findOneAsync(id);
    });
  },

  async "leagues.get"(leagueId: string) {
    return withMethodLog("leagues.get", this.userId, async () => {
      check(leagueId, String);
      const league = await Leagues.findOneAsync(leagueId);
      if (!league) throw new Meteor.Error("not-found", "League not found");
      const members = await LeagueMembers.find({ leagueId }, { sort: { points: -1, wins: -1 } }).fetchAsync();
      const results = await LeagueResults.find({ leagueId }, { sort: { createdAt: -1 }, limit: 40 }).fetchAsync();
      const names = await displayNames([
        ...members.map((m) => m.userId),
        ...results.flatMap((r) => [...r.team1UserIds, ...r.team2UserIds]),
      ]);
      const mine = this.userId ? members.find((m) => m.userId === this.userId) : undefined;
      logInfo("leagues.get.ok", { leagueId, members: members.length });
      return {
        league,
        standings: members.map((m, i) => ({
          ...m,
          rank: i + 1,
          displayName: names.get(m.userId) || "Player",
        })),
        schedule: results.map((r) => ({
          ...r,
          team1Names: r.team1UserIds.map((id) => names.get(id) || "Player"),
          team2Names: r.team2UserIds.map((id) => names.get(id) || "Player"),
        })),
        membership: mine || null,
      };
    });
  },

  async "leagues.join"(leagueId: string) {
    return withMethodLog("leagues.join", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(leagueId, String);
      const league = await Leagues.findOneAsync(leagueId);
      if (!league) throw new Meteor.Error("not-found", "League not found");
      if (league.status === "completed") throw new Meteor.Error("closed", "Season completed");
      const existing = await LeagueMembers.findOneAsync({ leagueId, userId });
      if (existing) return league;
      await LeagueMembers.insertAsync({
        leagueId,
        userId,
        wins: 0,
        losses: 0,
        draws: 0,
        points: 0,
        joinedAt: new Date(),
      });
      if (league.status === "open") {
        await Leagues.updateAsync(leagueId, { $set: { status: "active" } });
      }
      logInfo("leagues.join.ok", { leagueId, userId });
      track("league_joined", { userId, leagueId });
      return await Leagues.findOneAsync(leagueId);
    });
  },

  async "leagues.recordResult"(input: {
    leagueId: string;
    opponentUserId: string;
    team1Sets: number;
    team2Sets: number;
    matchId?: string;
  }) {
    return withMethodLog("leagues.recordResult", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        leagueId: String,
        opponentUserId: String,
        team1Sets: Number,
        team2Sets: Number,
        matchId: Match.Optional(String),
      });
      if (input.opponentUserId === userId) throw new Meteor.Error("invalid-body", "Pick an opponent");
      const me = await LeagueMembers.findOneAsync({ leagueId: input.leagueId, userId });
      const opp = await LeagueMembers.findOneAsync({
        leagueId: input.leagueId,
        userId: input.opponentUserId,
      });
      if (!me || !opp) throw new Meteor.Error("forbidden", "Both players must be in the league");
      const t1 = Math.max(0, Math.round(input.team1Sets));
      const t2 = Math.max(0, Math.round(input.team2Sets));
      await LeagueResults.insertAsync({
        leagueId: input.leagueId,
        matchId: input.matchId,
        team1UserIds: [userId],
        team2UserIds: [input.opponentUserId],
        team1Sets: t1,
        team2Sets: t2,
        recordedBy: userId,
        createdAt: new Date(),
      });
      if (t1 > t2) {
        await LeagueMembers.updateAsync(me._id!, { $inc: { wins: 1, points: 2 } });
        await LeagueMembers.updateAsync(opp._id!, { $inc: { losses: 1 } });
      } else if (t2 > t1) {
        await LeagueMembers.updateAsync(opp._id!, { $inc: { wins: 1, points: 2 } });
        await LeagueMembers.updateAsync(me._id!, { $inc: { losses: 1 } });
      } else {
        await LeagueMembers.updateAsync(me._id!, { $inc: { draws: 1, points: 1 } });
        await LeagueMembers.updateAsync(opp._id!, { $inc: { draws: 1, points: 1 } });
      }
      logInfo("leagues.recordResult.ok", { leagueId: input.leagueId, userId, t1, t2 });
      track("league_result", { userId, leagueId: input.leagueId });
      return await Meteor.callAsync("leagues.get", input.leagueId);
    });
  },
});
