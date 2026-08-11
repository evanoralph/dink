import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { GamePlayers, Games } from "../../collections";
import { logDebug } from "../../lib/logger";

Meteor.publish("games.openNearby", function (filters?: { venueId?: string }) {
  check(filters, Match.Maybe({ venueId: Match.Maybe(String) }));
  logDebug("pub.games.openNearby", { userId: this.userId, filters });
  const query: Record<string, unknown> = {
    status: "open",
    visibility: "public",
    startsAt: { $gte: new Date() },
  };
  if (filters?.venueId) query.venueId = filters.venueId;
  return Games.find(query, { sort: { startsAt: 1 }, limit: 50 });
});

Meteor.publish("games.detail", function (gameId: string) {
  check(gameId, String);
  logDebug("pub.games.detail", { userId: this.userId, gameId });
  return [Games.find({ _id: gameId }), GamePlayers.find({ gameId, status: "joined" })];
});
