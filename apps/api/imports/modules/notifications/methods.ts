import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Notifications } from "../../collections";
import { requireUserId } from "../../lib/auth";
import { withMethodLog, logInfo } from "../../lib/logger";

Meteor.methods({
  async "notifications.list"(input: { limit?: number; unreadOnly?: boolean } = {}) {
    return withMethodLog("notifications.list", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        limit: Match.Optional(Number),
        unreadOnly: Match.Optional(Boolean),
      });
      const limit = Math.min(Math.max(input.limit || 30, 1), 100);
      const query: Record<string, unknown> = { userId };
      if (input.unreadOnly) query.read = false;
      const items = await Notifications.find(query, {
        sort: { createdAt: -1 },
        limit,
      }).fetchAsync();
      const unreadCount = await Notifications.find({ userId, read: false }).countAsync();
      logInfo("notifications.list.ok", { userId, count: items.length, unreadCount });
      return { items, unreadCount };
    });
  },

  async "notifications.markRead"(input: { notificationId?: string; all?: boolean }) {
    return withMethodLog("notifications.markRead", this.userId, async () => {
      const userId = await requireUserId(this.userId);
      check(input, {
        notificationId: Match.Optional(String),
        all: Match.Optional(Boolean),
      });
      if (input.all) {
        const n = await Notifications.updateAsync(
          { userId, read: false },
          { $set: { read: true } },
          { multi: true },
        );
        logInfo("notifications.markRead.all", { userId, count: n });
        return { updated: n };
      }
      if (!input.notificationId) {
        throw new Meteor.Error("invalid-body", "notificationId or all required");
      }
      const row = await Notifications.findOneAsync(input.notificationId);
      if (!row || row.userId !== userId) {
        throw new Meteor.Error("not-found", "Notification not found");
      }
      await Notifications.updateAsync(input.notificationId, { $set: { read: true } });
      return { updated: 1 };
    });
  },
});
