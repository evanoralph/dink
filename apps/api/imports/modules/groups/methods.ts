import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Games, GroupMembers, Groups } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";
import { track } from "../../lib/analytics";
import { displayNames } from "../../lib/userNames";

Meteor.methods({
  async "groups.list"(filters?: { city?: string }) {
    return withMethodLog("groups.list", this.userId, async () => {
      check(filters, Match.Maybe({ city: Match.Maybe(String) }));
      const query: Record<string, unknown> = { visibility: "public" };
      if (filters?.city) query.city = filters.city;
      const groups = await Groups.find(query, { sort: { memberCount: -1, name: 1 }, limit: 80 }).fetchAsync();
      logInfo("groups.list.ok", { count: groups.length, city: filters?.city });
      return groups;
    });
  },

  async "groups.create"(input: { name: string; city: string; description?: string }) {
    return withMethodLog("groups.create", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        name: String,
        city: String,
        description: Match.Optional(String),
      });
      const name = input.name.trim();
      const city = input.city.trim();
      if (name.length < 2) throw new Meteor.Error("invalid-body", "Name too short");
      const now = new Date();
      const groupId = await Groups.insertAsync({
        name,
        city,
        description: input.description?.trim(),
        creatorUserId: userId,
        visibility: "public",
        memberCount: 1,
        createdAt: now,
      });
      await GroupMembers.insertAsync({
        groupId,
        userId,
        role: "owner",
        status: "joined",
        joinedAt: now,
      });
      logInfo("groups.create.ok", { groupId, userId, city });
      track("group_created", { userId, groupId, city });
      return await Groups.findOneAsync(groupId);
    });
  },

  async "groups.get"(groupId: string) {
    return withMethodLog("groups.get", this.userId, async () => {
      check(groupId, String);
      const group = await Groups.findOneAsync(groupId);
      if (!group) throw new Meteor.Error("not-found", "Group not found");
      const members = await GroupMembers.find({ groupId, status: "joined" }).fetchAsync();
      const names = await displayNames(members.map((m) => m.userId));
      const roster = members.map((m) => ({
        ...m,
        displayName: names.get(m.userId) || "Player",
      }));
      const mine = this.userId
        ? members.find((m) => m.userId === this.userId)
        : undefined;
      logInfo("groups.get.ok", { groupId, members: members.length });
      return { group, members: roster, membership: mine || null };
    });
  },

  async "groups.join"(groupId: string) {
    return withMethodLog("groups.join", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(groupId, String);
      const group = await Groups.findOneAsync(groupId);
      if (!group) throw new Meteor.Error("not-found", "Group not found");
      const existing = await GroupMembers.findOneAsync({ groupId, userId });
      if (existing?.status === "joined") return group;
      if (existing) {
        await GroupMembers.updateAsync(existing._id!, {
          $set: { status: "joined", joinedAt: new Date() },
        });
      } else {
        await GroupMembers.insertAsync({
          groupId,
          userId,
          role: "member",
          status: "joined",
          joinedAt: new Date(),
        });
      }
      await Groups.updateAsync(groupId, { $inc: { memberCount: 1 } });
      logInfo("groups.join.ok", { groupId, userId });
      track("group_joined", { userId, groupId });
      return await Groups.findOneAsync(groupId);
    });
  },

  async "groups.leave"(groupId: string) {
    return withMethodLog("groups.leave", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(groupId, String);
      const member = await GroupMembers.findOneAsync({ groupId, userId, status: "joined" });
      if (!member) return await Groups.findOneAsync(groupId);
      if (member.role === "owner") {
        throw new Meteor.Error("forbidden", "Owner cannot leave — transfer or keep the group");
      }
      await GroupMembers.updateAsync(member._id!, { $set: { status: "left" } });
      await Groups.updateAsync(groupId, { $inc: { memberCount: -1 } });
      logInfo("groups.leave.ok", { groupId, userId });
      return await Groups.findOneAsync(groupId);
    });
  },

  async "groups.feed"(groupId: string) {
    return withMethodLog("groups.feed", this.userId, async () => {
      check(groupId, String);
      const group = await Groups.findOneAsync(groupId);
      if (!group) throw new Meteor.Error("not-found", "Group not found");
      const games = await Games.find(
        { groupId, startsAt: { $gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) } },
        { sort: { startsAt: 1 }, limit: 40 },
      ).fetchAsync();
      logInfo("groups.feed.ok", { groupId, games: games.length });
      return { group, games };
    });
  },
});
