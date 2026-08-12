import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Friendships, GamePlayers } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";
import { notifyUser } from "../notifications/service";

Meteor.methods({
  async "friends.list"() {
    return withMethodLog("friends.list", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const rows = await Friendships.find({
        $or: [{ fromUserId: userId }, { toUserId: userId }],
      }).fetchAsync();
      const ids = rows.flatMap((r) => [r.fromUserId, r.toUserId]).filter((id) => id !== userId);
      const names = await displayNames(ids);
      const mapped = rows.map((r) => {
        const otherId = r.fromUserId === userId ? r.toUserId : r.fromUserId;
        return {
          ...r,
          otherUserId: otherId,
          displayName: names.get(otherId) || "Player",
          incoming: r.toUserId === userId && r.status === "pending",
        };
      });
      logInfo("friends.list.ok", { userId, count: mapped.length });
      return mapped;
    });
  },

  async "friends.request"(toUserId: string) {
    return withMethodLog("friends.request", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(toUserId, String);
      if (toUserId === userId) throw new Meteor.Error("invalid-body", "Cannot friend yourself");
      const reverse = await Friendships.findOneAsync({ fromUserId: toUserId, toUserId: userId });
      if (reverse?.status === "accepted") return reverse;
      if (reverse?.status === "pending") {
        await Friendships.updateAsync(reverse._id!, { $set: { status: "accepted" } });
        logInfo("friends.request.auto_accept", { userId, toUserId });
        track("friend_accepted", { userId, otherUserId: toUserId });
        return await Friendships.findOneAsync(reverse._id!);
      }
      const existing = await Friendships.findOneAsync({ fromUserId: userId, toUserId });
      if (existing) return existing;
      const id = await Friendships.insertAsync({
        fromUserId: userId,
        toUserId,
        status: "pending",
        createdAt: new Date(),
      });
      await notifyUser({
        userId: toUserId,
        type: "friend.request",
        title: "Friend request",
        body: "A player wants to connect on Dink.",
        entityType: "user",
        entityId: userId,
      });
      logInfo("friends.request.ok", { userId, toUserId });
      track("friend_requested", { userId, toUserId });
      return await Friendships.findOneAsync(id);
    });
  },

  async "friends.accept"(fromUserId: string) {
    return withMethodLog("friends.accept", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(fromUserId, String);
      const row = await Friendships.findOneAsync({ fromUserId, toUserId: userId, status: "pending" });
      if (!row) throw new Meteor.Error("not-found", "No pending request");
      await Friendships.updateAsync(row._id!, { $set: { status: "accepted" } });
      logInfo("friends.accept.ok", { userId, fromUserId });
      track("friend_accepted", { userId, otherUserId: fromUserId });
      return await Friendships.findOneAsync(row._id!);
    });
  },

  /** P3-04: players you have shared a game lobby with. */
  async "friends.playedWith"() {
    return withMethodLog("friends.playedWith", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      const mine = await GamePlayers.find({ userId, status: "joined" }).fetchAsync();
      const gameIds = mine.map((p) => p.gameId);
      if (!gameIds.length) return [];
      const others = await GamePlayers.find({
        gameId: { $in: gameIds },
        userId: { $ne: userId },
        status: "joined",
      }).fetchAsync();
      const counts = new Map<string, number>();
      for (const row of others) {
        counts.set(row.userId, (counts.get(row.userId) || 0) + 1);
      }
      const ranked = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20);
      const names = await displayNames(ranked.map(([id]) => id));
      logInfo("friends.playedWith.ok", { userId, count: ranked.length });
      return ranked.map(([id, gamesTogether]) => ({
        userId: id,
        displayName: names.get(id) || "Player",
        gamesTogether,
      }));
    });
  },
});
