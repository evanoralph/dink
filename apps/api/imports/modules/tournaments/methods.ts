import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import {
  Payments,
  TournamentEntries,
  TournamentMatches,
  Tournaments,
} from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";
import { notifyUser } from "../notifications/service";

function nextPowerOfTwo(n: number) {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

Meteor.methods({
  async "tournaments.list"(filters?: { city?: string }) {
    return withMethodLog("tournaments.list", this.userId, async () => {
      const query: Record<string, unknown> = {};
      if (filters?.city) query.city = filters.city;
      const rows = await Tournaments.find(query, { sort: { startsAt: 1 }, limit: 50 }).fetchAsync();
      logInfo("tournaments.list.ok", { count: rows.length });
      return rows;
    });
  },

  async "tournaments.create"(input: {
    name: string;
    city: string;
    startsAt: string;
    entryFee?: number;
    format?: "single_elim" | "round_robin";
    capacity?: number;
    venueId?: string;
  }) {
    return withMethodLog("tournaments.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        name: String,
        city: String,
        startsAt: String,
        entryFee: Match.Optional(Number),
        format: Match.Optional(String),
        capacity: Match.Optional(Number),
        venueId: Match.Optional(String),
      });
      const startsAt = new Date(input.startsAt);
      if (Number.isNaN(startsAt.getTime())) throw new Meteor.Error("invalid-date", "Invalid start");
      const format = input.format === "round_robin" ? "round_robin" : "single_elim";
      const id = await Tournaments.insertAsync({
        name: input.name.trim(),
        city: input.city.trim(),
        venueId: input.venueId,
        startsAt,
        entryFee: Math.max(0, Math.round(input.entryFee || 0)),
        currency: "PHP",
        format,
        capacity: Math.min(32, Math.max(2, Math.round(input.capacity || 8))),
        status: "open",
        creatorUserId: userId,
        createdAt: new Date(),
      });
      logInfo("tournaments.create.ok", { tournamentId: id, userId, format });
      track("tournament_created", { userId, tournamentId: id });
      return await Tournaments.findOneAsync(id);
    });
  },

  async "tournaments.get"(tournamentId: string) {
    return withMethodLog("tournaments.get", this.userId, async () => {
      check(tournamentId, String);
      const tournament = await Tournaments.findOneAsync(tournamentId);
      if (!tournament) throw new Meteor.Error("not-found", "Tournament not found");
      const entries = await TournamentEntries.find({ tournamentId }, { sort: { seed: 1 } }).fetchAsync();
      const matches = await TournamentMatches.find(
        { tournamentId },
        { sort: { round: 1, slot: 1 } },
      ).fetchAsync();
      const names = await displayNames([
        ...entries.map((e) => e.userId),
        ...matches.flatMap((m) => [m.player1Id, m.player2Id, m.winnerId].filter(Boolean) as string[]),
      ]);
      const mine = this.userId ? entries.find((e) => e.userId === this.userId) : undefined;
      logInfo("tournaments.get.ok", { tournamentId, entries: entries.length, matches: matches.length });
      return {
        tournament,
        entries: entries.map((e) => ({ ...e, displayName: names.get(e.userId) || "Player" })),
        matches: matches.map((m) => ({
          ...m,
          player1Name: m.player1Id ? names.get(m.player1Id) || "Player" : "TBD",
          player2Name: m.player2Id ? names.get(m.player2Id) || "Player" : m.status === "bye" ? "BYE" : "TBD",
          winnerName: m.winnerId ? names.get(m.winnerId) || "Player" : null,
        })),
        membership: mine || null,
      };
    });
  },

  async "tournaments.register"(tournamentId: string) {
    return withMethodLog("tournaments.register", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(tournamentId, String);
      const tournament = await Tournaments.findOneAsync(tournamentId);
      if (!tournament) throw new Meteor.Error("not-found", "Tournament not found");
      if (tournament.status !== "open") throw new Meteor.Error("closed", "Registration closed");
      const existing = await TournamentEntries.findOneAsync({ tournamentId, userId });
      if (existing) return existing;
      const count = await TournamentEntries.find({ tournamentId }).countAsync();
      if (count >= tournament.capacity) throw new Meteor.Error("full", "Tournament is full");
      const paid = tournament.entryFee <= 0;
      let paymentId: string | undefined;
      if (!paid) {
        paymentId = await Payments.insertAsync({
          tournamentId,
          userId,
          provider: process.env.PAYMENT_PROVIDER || "stub",
          amount: tournament.entryFee,
          currency: tournament.currency,
          status: (process.env.PAYMENT_PROVIDER || "stub") === "stub" ? "paid" : "pending",
          createdAt: new Date(),
          updatedAt: new Date(),
          metadata: { kind: "tournament_entry" },
        });
      }
      const paymentStatus =
        paid || (process.env.PAYMENT_PROVIDER || "stub") === "stub" ? "paid" : "pending";
      const id = await TournamentEntries.insertAsync({
        tournamentId,
        userId,
        seed: count + 1,
        paymentStatus,
        paymentId,
        createdAt: new Date(),
      });
      logInfo("tournaments.register.ok", { tournamentId, userId, paymentStatus });
      track("tournament_registered", { userId, tournamentId, paymentStatus });
      return await TournamentEntries.findOneAsync(id);
    });
  },

  async "tournaments.start"(tournamentId: string) {
    return withMethodLog("tournaments.start", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(tournamentId, String);
      const tournament = await Tournaments.findOneAsync(tournamentId);
      if (!tournament) throw new Meteor.Error("not-found", "Tournament not found");
      if (tournament.creatorUserId !== userId) throw new Meteor.Error("forbidden", "Only the organizer can start");
      if (tournament.status === "in_progress" || tournament.status === "completed") {
        return await Meteor.callAsync("tournaments.get", tournamentId);
      }
      const entries = await TournamentEntries.find({
        tournamentId,
        paymentStatus: "paid",
      }, { sort: { seed: 1 } }).fetchAsync();
      if (entries.length < 2) throw new Meteor.Error("invalid-state", "Need at least 2 paid players");

      await TournamentMatches.removeAsync({ tournamentId });
      if (tournament.format === "round_robin") {
        let slot = 0;
        for (let i = 0; i < entries.length; i++) {
          for (let j = i + 1; j < entries.length; j++) {
            slot += 1;
            await TournamentMatches.insertAsync({
              tournamentId,
              round: 1,
              slot,
              player1Id: entries[i].userId,
              player2Id: entries[j].userId,
              status: "pending",
              createdAt: new Date(),
            });
          }
        }
      } else {
        const size = nextPowerOfTwo(entries.length);
        const seeds = [...entries.map((e) => e.userId)];
        while (seeds.length < size) seeds.push("");
        let slot = 0;
        for (let i = 0; i < size; i += 2) {
          slot += 1;
          const p1 = seeds[i] || undefined;
          const p2 = seeds[i + 1] || undefined;
          const bye = Boolean(p1 && !p2) || Boolean(!p1 && p2);
          const winner = bye ? p1 || p2 : undefined;
          await TournamentMatches.insertAsync({
            tournamentId,
            round: 1,
            slot,
            player1Id: p1,
            player2Id: p2,
            winnerId: winner,
            status: bye ? "bye" : "pending",
            createdAt: new Date(),
          });
        }
      }

      await Tournaments.updateAsync(tournamentId, { $set: { status: "in_progress" } });
      logInfo("tournaments.start.ok", { tournamentId, players: entries.length, format: tournament.format });
      track("tournament_started", { userId, tournamentId });
      return await Meteor.callAsync("tournaments.get", tournamentId);
    });
  },

  async "tournaments.reportWinner"(input: { matchId: string; winnerId: string }) {
    return withMethodLog("tournaments.reportWinner", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { matchId: String, winnerId: String });
      const row = await TournamentMatches.findOneAsync(input.matchId);
      if (!row) throw new Meteor.Error("not-found", "Match not found");
      const tournament = await Tournaments.findOneAsync(row.tournamentId);
      if (!tournament) throw new Meteor.Error("not-found", "Tournament not found");
      const isPlayer = row.player1Id === userId || row.player2Id === userId;
      if (!isPlayer && tournament.creatorUserId !== userId) {
        throw new Meteor.Error("forbidden", "Only players or organizer can report");
      }
      if (input.winnerId !== row.player1Id && input.winnerId !== row.player2Id) {
        throw new Meteor.Error("invalid-body", "Winner must be in this match");
      }
      await TournamentMatches.updateAsync(input.matchId, {
        $set: { winnerId: input.winnerId, status: "complete" },
      });

      if (tournament.format === "single_elim") {
        const roundMatches = await TournamentMatches.find({
          tournamentId: row.tournamentId,
          round: row.round,
        }).fetchAsync();
        const allDone = roundMatches.every((m) => m.status === "complete" || m.status === "bye");
        if (allDone) {
          const winners = roundMatches
            .sort((a, b) => a.slot - b.slot)
            .map((m) => m.winnerId)
            .filter(Boolean) as string[];
          if (winners.length === 1) {
            await Tournaments.updateAsync(row.tournamentId, { $set: { status: "completed" } });
            await notifyUser({
              userId: winners[0],
              type: "tournament.won",
              title: "Tournament champion",
              body: `You won ${tournament.name}.`,
              entityType: "tournament",
              entityId: row.tournamentId,
            });
          } else {
            const nextRound = row.round + 1;
            const existingNext = await TournamentMatches.find({
              tournamentId: row.tournamentId,
              round: nextRound,
            }).countAsync();
            if (!existingNext) {
              let slot = 0;
              for (let i = 0; i < winners.length; i += 2) {
                slot += 1;
                const p1 = winners[i];
                const p2 = winners[i + 1];
                await TournamentMatches.insertAsync({
                  tournamentId: row.tournamentId,
                  round: nextRound,
                  slot,
                  player1Id: p1,
                  player2Id: p2,
                  winnerId: p2 ? undefined : p1,
                  status: p2 ? "pending" : "bye",
                  createdAt: new Date(),
                });
              }
            }
          }
        }
      } else {
        const pending = await TournamentMatches.find({
          tournamentId: row.tournamentId,
          status: "pending",
        }).countAsync();
        if (!pending) {
          await Tournaments.updateAsync(row.tournamentId, { $set: { status: "completed" } });
        }
      }

      logInfo("tournaments.reportWinner.ok", {
        matchId: input.matchId,
        winnerId: input.winnerId,
        userId,
      });
      track("tournament_match_reported", { userId, matchId: input.matchId });
      return await Meteor.callAsync("tournaments.get", row.tournamentId);
    });
  },
});
