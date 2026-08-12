import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { GamePlayers, Games, GroupMembers, Matches, MatchSets, Venues } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { bumpReliability } from "../../lib/reliability";
import { runWithUserId } from "../../lib/requestContext";
import { track } from "../../lib/analytics";
import { parseBody } from "../../lib/validate";
import { createGameSchema, gameRsvpSchema } from "../../lib/zodSchemas";
import { notifyUser } from "../notifications/service";

Meteor.methods({
  async "games.list"(filters?: { city?: string; skill?: number; groupId?: string }) {
    return withMethodLog("games.list", this.userId, async () => {
      check(
        filters,
        Match.Maybe({
          city: Match.Maybe(String),
          skill: Match.Maybe(Number),
          groupId: Match.Maybe(String),
        }),
      );
      const query: Record<string, unknown> = {
        status: { $in: ["open", "full"] },
        visibility: "public",
        startsAt: { $gte: new Date() },
      };
      if (filters?.groupId) query.groupId = filters.groupId;
      if (filters?.skill !== undefined) {
        query.skillMin = { $lte: filters.skill };
        query.skillMax = { $gte: filters.skill };
      }
      let games = await Games.find(query, { sort: { startsAt: 1 }, limit: 50 }).fetchAsync();
      if (filters?.city) {
        const venues = await Venues.find({ city: filters.city, status: "approved" }).fetchAsync();
        const ids = new Set(venues.map((v) => v._id));
        games = games.filter((g) => ids.has(g.venueId));
      }
      return games;
    });
  },

  async "games.get"(gameId: string) {
    return withMethodLog("games.get", this.userId, async () => {
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      const players = await GamePlayers.find({
        gameId,
        status: { $in: ["joined", "maybe", "declined", "waitlist"] },
      }).fetchAsync();
      const userIds = players.map((p) => p.userId);
      const users = await Meteor.users
        .find(
          { _id: { $in: userIds } },
          {
            fields: {
              "profile.displayName": 1,
              "profile.reliabilityLevel": 1,
            },
          },
        )
        .fetchAsync();
      const byId = new Map(users.map((u) => [u._id!, u]));
      const roster = players.map((p) => ({
        ...p,
        displayName: byId.get(p.userId)?.profile?.displayName || "Player",
        reliabilityLevel: byId.get(p.userId)?.profile?.reliabilityLevel || "new",
      }));
      const match = await Matches.findOneAsync({ gameId });
      const sets = match?._id
        ? await MatchSets.find({ matchId: match._id }, { sort: { setNumber: 1 } }).fetchAsync()
        : [];
      return { game, players: roster, match: match || null, sets };
    });
  },

  async "games.create"(input: unknown) {
    return withMethodLog("games.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(createGameSchema, input, "game");
      if (body.skillMin > body.skillMax) {
        throw new Meteor.Error("invalid-skill", "skillMin must be <= skillMax");
      }
      const format = body.format || "doubles";
      const capacity = body.capacity || (format === "singles" ? 2 : 4);
      if (body.groupId) {
        const member = await GroupMembers.findOneAsync({
          groupId: body.groupId,
          userId,
          status: "joined",
        });
        if (!member) throw new Meteor.Error("forbidden", "Join the group first");
      }
      const gameId = await Games.insertAsync({
        bookingId: body.bookingId,
        venueId: body.venueId,
        courtId: body.courtId,
        organizerUserId: userId,
        startsAt: new Date(body.startsAt),
        format,
        skillMin: body.skillMin,
        skillMax: body.skillMax,
        visibility: body.visibility || "public",
        capacity,
        playerCount: 1,
        waitlistCount: 0,
        pricePerPlayer: body.pricePerPlayer,
        status: "open",
        inviteCode: Random.id(8),
        createdAt: new Date(),
        groupId: body.groupId,
        seriesId: body.groupId ? body.groupId : undefined,
      });
      await GamePlayers.insertAsync({
        gameId,
        userId,
        status: "joined",
        joinedAt: new Date(),
      });
      logInfo("games.create.ok", { gameId });
      track("game_created", { userId, gameId, venueId: body.venueId });
      return await Games.findOneAsync(gameId);
    });
  },

  async "games.join"(gameId: string) {
    return withMethodLog("games.join", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      if (game.status !== "open") throw new Meteor.Error("full", "Game not open");

      const existing = await GamePlayers.findOneAsync({ gameId, userId });
      if (existing?.status === "joined") return game;

      if (game.playerCount >= game.capacity) {
        if (existing?.status === "waitlist") return game;
        if (existing) {
          await GamePlayers.updateAsync(existing._id!, {
            $set: { status: "waitlist", joinedAt: new Date() },
          });
        } else {
          await GamePlayers.insertAsync({
            gameId,
            userId,
            status: "waitlist",
            joinedAt: new Date(),
          });
        }
        await Games.updateAsync(gameId, { $inc: { waitlistCount: 1 } });
        if (game.organizerUserId && game.organizerUserId !== userId) {
          await notifyUser({
            userId: game.organizerUserId,
            type: "game.waitlist",
            title: "Waitlist join",
            body: `A player joined the waitlist for ${game.startsAt.toLocaleString()}.`,
            entityType: "game",
            entityId: gameId,
          });
        }
        logInfo("games.join.waitlist", { gameId, userId });
        track("game_waitlisted", { userId, gameId });
        return await Games.findOneAsync(gameId);
      }

      const fromWaitlist = existing?.status === "waitlist";
      if (existing) {
        await GamePlayers.updateAsync(existing._id!, {
          $set: { status: "joined", joinedAt: new Date() },
        });
      } else {
        await GamePlayers.insertAsync({
          gameId,
          userId,
          status: "joined",
          joinedAt: new Date(),
        });
      }
      if (fromWaitlist) {
        await Games.updateAsync(gameId, { $inc: { waitlistCount: -1 } });
      }

      const playerCount = game.playerCount + 1;
      await Games.updateAsync(gameId, {
        $set: {
          playerCount,
          status: playerCount >= game.capacity ? "full" : "open",
        },
      });

      // P1-08: notify joiner + organizer.
      await notifyUser({
        userId,
        type: "game.joined",
        title: "You joined a game",
        body: `You're in for ${game.startsAt.toLocaleString()}. ${playerCount}/${game.capacity} players.`,
        entityType: "game",
        entityId: gameId,
      });
      if (game.organizerUserId && game.organizerUserId !== userId) {
        await notifyUser({
          userId: game.organizerUserId,
          type: "game.player_joined",
          title: "Someone joined your game",
          body: `A player joined your game at ${game.startsAt.toLocaleString()}. ${playerCount}/${game.capacity} filled.`,
          entityType: "game",
          entityId: gameId,
        });
      }

      logInfo("games.join.ok", { gameId, userId, playerCount });
      track("game_joined", { userId, gameId, playerCount });
      return await Games.findOneAsync(gameId);
    });
  },

  async "games.leave"(gameId: string) {
    return withMethodLog("games.leave", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      if (!["open", "full"].includes(game.status)) {
        throw new Meteor.Error("invalid-state", "Can only leave open/full games");
      }
      const player = await GamePlayers.findOneAsync({ gameId, userId, status: "joined" });
      if (!player) return game;
      await GamePlayers.updateAsync(player._id!, { $set: { status: "left" } });
      const playerCount = Math.max(0, game.playerCount - 1);
      await Games.updateAsync(gameId, {
        $set: {
          playerCount,
          status: game.status === "cancelled" ? "cancelled" : "open",
        },
      });
      await promoteWaitlist(gameId);
      const late = game.startsAt.getTime() - Date.now() <= 2 * 60 * 60 * 1000;
      if (late) {
        await bumpReliability(userId, "no_show");
      }
      if (game.organizerUserId && game.organizerUserId !== userId) {
        await notifyUser({
          userId: game.organizerUserId,
          type: "game.player_left",
          title: "A player left your game",
          body: `Someone left. ${playerCount}/${game.capacity} going.`,
          entityType: "game",
          entityId: gameId,
        });
      }
      logInfo("games.leave.ok", { gameId, userId, playerCount, late });
      return await Games.findOneAsync(gameId);
    });
  },

  /** P2-03: Going / Maybe / Can't — notify organizer. */
  async "games.rsvp"(input: unknown) {
    return withMethodLog("games.rsvp", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const body = parseBody(gameRsvpSchema, input, "rsvp");
      const game = await Games.findOneAsync(body.gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      if (!["open", "full"].includes(game.status)) {
        throw new Meteor.Error("invalid-state", "Game is not open for RSVP");
      }

      const mapped = body.status === "going" ? "joined" : body.status;
      const existing = await GamePlayers.findOneAsync({ gameId: body.gameId, userId });
      const wasGoing = existing?.status === "joined";
      const willGo = mapped === "joined";

      if (willGo && !wasGoing && game.playerCount >= game.capacity) {
        if (existing) {
          await GamePlayers.updateAsync(existing._id!, {
            $set: { status: "waitlist", joinedAt: new Date() },
          });
        } else {
          await GamePlayers.insertAsync({
            gameId: body.gameId,
            userId,
            status: "waitlist",
            joinedAt: new Date(),
          });
        }
        await Games.updateAsync(body.gameId, { $inc: { waitlistCount: 1 } });
        logInfo("games.rsvp.waitlist", { gameId: body.gameId, userId });
        return await Games.findOneAsync(body.gameId);
      }

      if (existing) {
        await GamePlayers.updateAsync(existing._id!, {
          $set: { status: mapped, joinedAt: willGo ? new Date() : existing.joinedAt },
        });
      } else {
        await GamePlayers.insertAsync({
          gameId: body.gameId,
          userId,
          status: mapped,
          joinedAt: new Date(),
        });
      }

      let playerCount = game.playerCount;
      if (willGo && !wasGoing) playerCount += 1;
      if (!willGo && wasGoing) playerCount = Math.max(0, playerCount - 1);

      await Games.updateAsync(body.gameId, {
        $set: {
          playerCount,
          status: playerCount >= game.capacity ? "full" : "open",
        },
      });

      if (game.organizerUserId && game.organizerUserId !== userId) {
        await notifyUser({
          userId: game.organizerUserId,
          type: "game.rsvp",
          title: "RSVP update",
          body: `A player marked ${body.status}. ${playerCount}/${game.capacity} going.`,
          entityType: "game",
          entityId: body.gameId,
        });
      }
      logInfo("games.rsvp.ok", { gameId: body.gameId, userId, status: mapped, playerCount });
      return await Games.findOneAsync(body.gameId);
    });
  },

  /** P1-23: join via invite code (case-insensitive trim). */
  async "games.joinByCode"(code: string) {
    return withMethodLog("games.joinByCode", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(code, String);
      const normalized = code.trim();
      if (!normalized) throw new Meteor.Error("invalid-body", "Invite code required");
      const game = await Games.findOneAsync({
        inviteCode: { $regex: `^${normalized.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      });
      if (!game?._id) throw new Meteor.Error("not-found", "No game for that invite code");
      logInfo("games.joinByCode.found", { gameId: game._id });
      // Preserve REST auth context across nested method call.
      return runWithUserId(userId, () => Meteor.callAsync("games.join", game._id));
    });
  },

  async "games.playAgain"(gameId: string) {
    return withMethodLog("games.playAgain", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      if (game.status !== "completed") {
        throw new Meteor.Error("invalid-state", "Play again is for completed games");
      }
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const created = await runWithUserId(userId, () =>
        Meteor.callAsync("games.create", {
          venueId: game.venueId,
          courtId: game.courtId,
          startsAt: startsAt.toISOString(),
          format: game.format,
          skillMin: game.skillMin,
          skillMax: game.skillMax,
          capacity: game.capacity,
          pricePerPlayer: game.pricePerPlayer,
          visibility: game.visibility,
        }),
      );
      logInfo("games.playAgain.ok", {
        fromGameId: gameId,
        newGameId: (created as { _id?: string })?._id,
        userId,
      });
      return created;
    });
  },

  /** P3-05: organizer posts the same open play +7 days. */
  async "games.repeatWeekly"(gameId: string) {
    return withMethodLog("games.repeatWeekly", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      if (game.organizerUserId !== userId) {
        throw new Meteor.Error("forbidden", "Only the organizer can repeat this session");
      }
      const startsAt = new Date(game.startsAt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const created = await runWithUserId(userId, () =>
        Meteor.callAsync("games.create", {
          venueId: game.venueId,
          courtId: game.courtId,
          startsAt: startsAt.toISOString(),
          format: game.format,
          skillMin: game.skillMin,
          skillMax: game.skillMax,
          capacity: game.capacity,
          pricePerPlayer: game.pricePerPlayer,
          visibility: game.visibility,
          groupId: game.groupId,
        }),
      );
      const newId = (created as { _id?: string })?._id;
      if (newId) {
        await Games.updateAsync(newId, {
          $set: { seriesId: game.seriesId || game._id },
        });
      }
      logInfo("games.repeatWeekly.ok", { fromGameId: gameId, newGameId: newId, userId });
      track("open_play_repeated", { userId, fromGameId: gameId, newGameId: newId });
      return created;
    });
  },
});

async function promoteWaitlist(gameId: string) {
  const game = await Games.findOneAsync(gameId);
  if (!game || ["cancelled", "completed"].includes(game.status)) return;
  if (game.playerCount >= game.capacity) return;
  const next = await GamePlayers.findOneAsync(
    { gameId, status: "waitlist" },
    { sort: { joinedAt: 1 } },
  );
  if (!next) return;
  await GamePlayers.updateAsync(next._id!, { $set: { status: "joined", joinedAt: new Date() } });
  const playerCount = game.playerCount + 1;
  await Games.updateAsync(gameId, {
    $set: {
      playerCount,
      status: playerCount >= game.capacity ? "full" : "open",
    },
    $inc: { waitlistCount: -1 },
  });
  await notifyUser({
    userId: next.userId,
    type: "game.waitlist_promoted",
    title: "You're in",
    body: `A spot opened — you're now going for ${game.startsAt.toLocaleString()}.`,
    entityType: "game",
    entityId: gameId,
  });
  logInfo("games.waitlist.promoted", { gameId, userId: next.userId, playerCount });
}
