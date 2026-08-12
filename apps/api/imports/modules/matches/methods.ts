import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Games, MatchSets, Matches, Venues } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";
import { bumpReliabilityMany } from "../../lib/reliability";
import { applyMatchRatings } from "../../lib/rating";
import { notifyUsers } from "../notifications/service";

Meteor.methods({
  async "matches.submitResult"(input: {
    gameId: string;
    sets: Array<{ setNumber: number; team1Score: number; team2Score: number }>;
    team1UserIds: string[];
    team2UserIds: string[];
  }) {
    return withMethodLog("matches.submitResult", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        gameId: String,
        sets: [
          {
            setNumber: Number,
            team1Score: Number,
            team2Score: Number,
          },
        ],
        team1UserIds: [String],
        team2UserIds: [String],
      });

      const game = await Games.findOneAsync(input.gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");

      let match = await Matches.findOneAsync({ gameId: input.gameId });
      const now = new Date();
      if (!match) {
        const matchId = await Matches.insertAsync({
          gameId: input.gameId,
          status: "submitted",
          team1UserIds: input.team1UserIds,
          team2UserIds: input.team2UserIds,
          submittedBy: userId,
          confirmedBy: [userId],
          completedAt: now,
          createdAt: now,
        });
        match = await Matches.findOneAsync(matchId);
      } else {
        await Matches.updateAsync(match._id!, {
          $set: {
            status: "submitted",
            team1UserIds: input.team1UserIds,
            team2UserIds: input.team2UserIds,
            submittedBy: userId,
            completedAt: now,
          },
          $addToSet: { confirmedBy: userId },
        });
        match = await Matches.findOneAsync(match._id!);
      }

      await MatchSets.removeAsync({ matchId: match!._id! });
      for (const set of input.sets) {
        await MatchSets.insertAsync({
          matchId: match!._id!,
          setNumber: set.setNumber,
          team1Score: set.team1Score,
          team2Score: set.team2Score,
        });
      }

      await Games.updateAsync(input.gameId, { $set: { status: "completed" } });

      const participants = [...input.team1UserIds, ...input.team2UserIds].filter(
        (id) => id && id !== "unknown",
      );
      await notifyUsers(
        participants.filter((id) => id !== userId),
        {
          type: "match.submitted",
          title: "Match result submitted",
          body: "A match result was submitted for your game. Open the game to confirm the score.",
          entityType: "match",
          entityId: match!._id!,
        },
      );

      logInfo("matches.submit.ok", { matchId: match!._id, gameId: input.gameId });
      track("match_result_submitted", { userId, gameId: input.gameId, matchId: match!._id });
      return {
        match: await Matches.findOneAsync(match!._id!),
        sets: await MatchSets.find({ matchId: match!._id! }).fetchAsync(),
      };
    });
  },

  async "matches.confirm"(matchId: string) {
    return withMethodLog("matches.confirm", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(matchId, String);
      const match = await Matches.findOneAsync(matchId);
      if (!match) throw new Meteor.Error("not-found", "Match not found");
      const participants = [...match.team1UserIds, ...match.team2UserIds];
      if (!participants.includes(userId)) {
        throw new Meteor.Error("forbidden", "Not a match participant");
      }
      await Matches.updateAsync(matchId, {
        $addToSet: { confirmedBy: userId },
      });
      const updated = await Matches.findOneAsync(matchId);
      const confirmed = new Set(updated?.confirmedBy || []);
      if (participants.every((id) => confirmed.has(id))) {
        await Matches.updateAsync(matchId, {
          $set: { status: "confirmed", verifiedAt: new Date() },
        });
        const game = await Games.findOneAsync(match.gameId);
        if (game && !game.bookingId) {
          await bumpReliabilityMany(participants, "complete");
        }
        await applyMatchRatings(matchId);
        logInfo("matches.confirm.all", { matchId, gameId: match.gameId });
        track("match_result_confirmed", { userId, matchId, gameId: match.gameId });
      }
      return await Matches.findOneAsync(matchId);
    });
  },

  async "matches.history"() {
    return withMethodLog("matches.history", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const matches = await Matches.find(
        {
          $or: [{ team1UserIds: userId }, { team2UserIds: userId }],
        },
        { sort: { createdAt: -1 }, limit: 50 },
      ).fetchAsync();
      const gameIds = matches.map((m) => m.gameId);
      const games = gameIds.length
        ? await Games.find({ _id: { $in: gameIds } }).fetchAsync()
        : [];
      const gameById = new Map(games.map((g) => [g._id!, g]));
      const setsByMatch = new Map<string, Array<{ setNumber: number; team1Score: number; team2Score: number }>>();
      for (const match of matches) {
        if (!match._id) continue;
        const sets = await MatchSets.find({ matchId: match._id }, { sort: { setNumber: 1 } }).fetchAsync();
        setsByMatch.set(match._id, sets);
      }
      logInfo("matches.history.ok", { userId, count: matches.length });
      return matches.map((m) => ({
        ...m,
        sets: setsByMatch.get(m._id!) || [],
        game: gameById.get(m.gameId)
          ? {
              _id: gameById.get(m.gameId)!._id,
              startsAt: gameById.get(m.gameId)!.startsAt,
              format: gameById.get(m.gameId)!.format,
              venueId: gameById.get(m.gameId)!.venueId,
            }
          : null,
      }));
    });
  },

  /** P3-08: public share card (no auth). */
  async "matches.share"(matchId: string) {
    return withMethodLog("matches.share", this.userId, async () => {
      check(matchId, String);
      const match = await Matches.findOneAsync(matchId);
      if (!match || match.status === "pending") {
        throw new Meteor.Error("not-found", "Match not found");
      }
      const sets = await MatchSets.find({ matchId }, { sort: { setNumber: 1 } }).fetchAsync();
      const game = await Games.findOneAsync(match.gameId);
      const venue = game?.venueId ? await Venues.findOneAsync(game.venueId) : null;
      const ids = [...match.team1UserIds, ...match.team2UserIds];
      const names = await displayNames(ids);
      logInfo("matches.share.ok", { matchId, gameId: match.gameId });
      return {
        match: {
          _id: match._id,
          status: match.status,
          team1UserIds: match.team1UserIds,
          team2UserIds: match.team2UserIds,
          completedAt: match.completedAt,
        },
        sets,
        game: game
          ? {
              _id: game._id,
              startsAt: game.startsAt,
              format: game.format,
              venueName: venue?.name,
              city: venue?.city,
            }
          : null,
        team1: match.team1UserIds.map((id) => names.get(id) || "Player"),
        team2: match.team2UserIds.map((id) => names.get(id) || "Player"),
      };
    });
  },
});
