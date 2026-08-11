import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Games, MatchSets, Matches } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";

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
      logInfo("matches.submit.ok", { matchId: match!._id, gameId: input.gameId });
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
      }
      return await Matches.findOneAsync(matchId);
    });
  },

  async "matches.history"() {
    return withMethodLog("matches.history", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      return Matches.find(
        {
          $or: [{ team1UserIds: userId }, { team2UserIds: userId }],
        },
        { sort: { createdAt: -1 }, limit: 50 },
      ).fetchAsync();
    });
  },
});
