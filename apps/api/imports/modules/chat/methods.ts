import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { ChatMessages, GamePlayers, Games, GroupMembers } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { displayNames } from "../../lib/userNames";

async function assertChannelAccess(userId: string, channelType: "game" | "group", channelId: string) {
  if (channelType === "game") {
    const game = await Games.findOneAsync(channelId);
    if (!game) throw new Meteor.Error("not-found", "Game not found");
    if (game.organizerUserId === userId) return;
    const player = await GamePlayers.findOneAsync({
      gameId: channelId,
      userId,
      status: { $in: ["joined", "maybe", "waitlist"] },
    });
    if (!player) throw new Meteor.Error("forbidden", "Join the game lobby to chat");
    return;
  }
  const member = await GroupMembers.findOneAsync({
    groupId: channelId,
    userId,
    status: "joined",
  });
  if (!member) throw new Meteor.Error("forbidden", "Join the group to chat");
}

Meteor.methods({
  async "chat.list"(input: { channelType: "game" | "group"; channelId: string; after?: string }) {
    return withMethodLog("chat.list", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        channelType: String,
        channelId: String,
        after: Match.Optional(String),
      });
      if (input.channelType !== "game" && input.channelType !== "group") {
        throw new Meteor.Error("invalid-body", "Invalid channel");
      }
      await assertChannelAccess(userId, input.channelType, input.channelId);
      const query: Record<string, unknown> = {
        channelType: input.channelType,
        channelId: input.channelId,
      };
      if (input.after) {
        const afterDate = new Date(input.after);
        if (!Number.isNaN(afterDate.getTime())) query.createdAt = { $gt: afterDate };
      }
      const rows = await ChatMessages.find(query, { sort: { createdAt: 1 }, limit: 80 }).fetchAsync();
      const names = await displayNames(rows.map((m) => m.userId));
      logInfo("chat.list.ok", {
        channelType: input.channelType,
        channelId: input.channelId,
        count: rows.length,
      });
      return rows.map((m) => ({
        ...m,
        displayName: names.get(m.userId) || "Player",
      }));
    });
  },

  async "chat.post"(input: { channelType: "game" | "group"; channelId: string; body: string }) {
    return withMethodLog("chat.post", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, { channelType: String, channelId: String, body: String });
      if (input.channelType !== "game" && input.channelType !== "group") {
        throw new Meteor.Error("invalid-body", "Invalid channel");
      }
      const text = input.body.trim().slice(0, 500);
      if (!text) throw new Meteor.Error("invalid-body", "Message required");
      await assertChannelAccess(userId, input.channelType, input.channelId);
      const id = await ChatMessages.insertAsync({
        channelType: input.channelType,
        channelId: input.channelId,
        userId,
        body: text,
        createdAt: new Date(),
      });
      logInfo("chat.post.ok", {
        messageId: id,
        channelType: input.channelType,
        channelId: input.channelId,
        userId,
      });
      const user = await Meteor.users.findOneAsync(userId, { fields: { "profile.displayName": 1 } });
      return {
        _id: id,
        channelType: input.channelType,
        channelId: input.channelId,
        userId,
        body: text,
        createdAt: new Date(),
        displayName: user?.profile?.displayName || "Player",
      };
    });
  },
});
