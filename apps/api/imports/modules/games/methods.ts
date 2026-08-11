import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Random } from "meteor/random";
import { GamePlayers, Games, Venues } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";

Meteor.methods({
  async "games.list"(filters?: { city?: string; skill?: number }) {
    return withMethodLog("games.list", this.userId, async () => {
      check(
        filters,
        Match.Maybe({ city: Match.Maybe(String), skill: Match.Maybe(Number) }),
      );
      const query: Record<string, unknown> = {
        status: "open",
        visibility: "public",
        startsAt: { $gte: new Date() },
      };
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
      const players = await GamePlayers.find({ gameId, status: "joined" }).fetchAsync();
      return { game, players };
    });
  },

  async "games.create"(input: {
    bookingId?: string;
    venueId: string;
    courtId?: string;
    startsAt: string;
    format?: "singles" | "doubles";
    skillMin: number;
    skillMax: number;
    capacity?: number;
    pricePerPlayer?: number;
    visibility?: "public" | "invite";
  }) {
    return withMethodLog("games.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        bookingId: Match.Optional(String),
        venueId: String,
        courtId: Match.Optional(String),
        startsAt: String,
        format: Match.Optional(String),
        skillMin: Number,
        skillMax: Number,
        capacity: Match.Optional(Number),
        pricePerPlayer: Match.Optional(Number),
        visibility: Match.Optional(String),
      });
      if (input.skillMin > input.skillMax) {
        throw new Meteor.Error("invalid-skill", "skillMin must be <= skillMax");
      }
      const capacity = input.capacity || (input.format === "singles" ? 2 : 4);
      const gameId = await Games.insertAsync({
        bookingId: input.bookingId,
        venueId: input.venueId,
        courtId: input.courtId,
        organizerUserId: userId,
        startsAt: new Date(input.startsAt),
        format: (input.format as "singles" | "doubles") || "doubles",
        skillMin: input.skillMin,
        skillMax: input.skillMax,
        visibility: (input.visibility as "public" | "invite") || "public",
        capacity,
        playerCount: 1,
        pricePerPlayer: input.pricePerPlayer,
        status: "open",
        inviteCode: Random.id(8),
        createdAt: new Date(),
      });
      await GamePlayers.insertAsync({
        gameId,
        userId,
        status: "joined",
        joinedAt: new Date(),
      });
      logInfo("games.create.ok", { gameId });
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
        throw new Meteor.Error("full", "Game is full");
      }

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

      const playerCount = game.playerCount + 1;
      await Games.updateAsync(gameId, {
        $set: {
          playerCount,
          status: playerCount >= game.capacity ? "full" : "open",
        },
      });
      return await Games.findOneAsync(gameId);
    });
  },

  async "games.leave"(gameId: string) {
    return withMethodLog("games.leave", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
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
      return await Games.findOneAsync(gameId);
    });
  },

  async "games.playAgain"(gameId: string) {
    return withMethodLog("games.playAgain", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(gameId, String);
      const game = await Games.findOneAsync(gameId);
      if (!game) throw new Meteor.Error("not-found", "Game not found");
      const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      return Meteor.callAsync("games.create", {
        venueId: game.venueId,
        courtId: game.courtId,
        startsAt: startsAt.toISOString(),
        format: game.format,
        skillMin: game.skillMin,
        skillMax: game.skillMax,
        capacity: game.capacity,
        pricePerPlayer: game.pricePerPlayer,
        visibility: game.visibility,
      });
    });
  },
});
