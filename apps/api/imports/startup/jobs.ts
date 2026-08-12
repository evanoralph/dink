import { Meteor } from "meteor/meteor";
import {
  BookingParticipants,
  Bookings,
  GamePlayers,
  Games,
  Payments,
} from "../collections";
import { logInfo, logWarn } from "../lib/logger";
import { notifyUser } from "../modules/notifications/service";

let started = false;

async function maybeSms(userId: string, text: string) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_FROM;
  if (!sid || !token || !from) {
    logInfo("notifications.sms.skipped", { userId, reason: "no_twilio" });
    return;
  }
  const user = await Meteor.users.findOneAsync(userId);
  const phone = (user?.profile as { phone?: string } | undefined)?.phone;
  if (!phone) {
    logInfo("notifications.sms.skipped", { userId, reason: "no_phone" });
    return;
  }
  try {
    const auth = Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: phone, From: from, Body: text }).toString(),
    });
    if (!res.ok) {
      logWarn("notifications.sms.fail", { userId, status: res.status });
      return;
    }
    logInfo("notifications.sms.sent", { userId });
  } catch (err) {
    logWarn("notifications.sms.error", {
      userId,
      message: err instanceof Error ? err.message : String(err),
    });
  }
}

export function startJobs() {
  if (started) return;
  started = true;

  // P1-04: expire unpaid holds + release slot + fail pending payments.
  Meteor.setInterval(async () => {
    const now = new Date();
    const due = await Bookings.find({
      status: "pending_payment",
      expiresAt: { $lte: now },
    }).fetchAsync();

    if (due.length === 0) return;

    const ids = due.map((b) => b._id!).filter(Boolean);
    const expired = await Bookings.updateAsync(
      { _id: { $in: ids }, status: "pending_payment" },
      { $set: { status: "expired", updatedAt: now } },
      { multi: true },
    );

    const paymentsFailed = await Payments.updateAsync(
      { bookingId: { $in: ids }, status: "pending" },
      { $set: { status: "failed", updatedAt: now } },
      { multi: true },
    );

    await BookingParticipants.updateAsync(
      { bookingId: { $in: ids }, paymentStatus: "pending" },
      { $set: { paymentStatus: "failed" } },
      { multi: true },
    );

    for (const booking of due) {
      if (!booking.creatorUserId || !booking._id) continue;
      await notifyUser({
        userId: booking.creatorUserId,
        type: "booking.expired",
        title: "Booking hold expired",
        body: `Your unpaid hold for ${booking.startsAt.toLocaleString()} expired and the court slot was released.`,
        entityType: "booking",
        entityId: booking._id,
      });
    }

    logInfo("jobs.expireBookings", {
      count: expired,
      bookingIds: ids,
      paymentsFailed,
      notified: due.length,
      note: "slots released — expired bookings no longer block availability",
    });
  }, 60_000);

  // P2-08: reminder ~2h before confirmed booking / upcoming game.
  Meteor.setInterval(async () => {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 60 * 60_000);
    const windowEnd = new Date(now.getTime() + 2 * 60 * 60_000);

    const bookings = await Bookings.find({
      status: "confirmed",
      reminderSentAt: { $exists: false },
      startsAt: { $gte: windowStart, $lte: windowEnd },
    }).fetchAsync();

    for (const booking of bookings) {
      if (!booking._id || !booking.creatorUserId) continue;
      const body = `Reminder: court booking at ${booking.startsAt.toLocaleString()}.`;
      await notifyUser({
        userId: booking.creatorUserId,
        type: "booking.reminder",
        title: "Court in about 2 hours",
        body,
        entityType: "booking",
        entityId: booking._id,
      });
      await maybeSms(booking.creatorUserId, `Dink: ${body}`);
      await Bookings.updateAsync(booking._id, { $set: { reminderSentAt: now } });
      logInfo("jobs.remindBooking", { bookingId: booking._id });
    }

    const games = await Games.find({
      status: { $in: ["open", "full"] },
      reminderSentAt: { $exists: false },
      startsAt: { $gte: windowStart, $lte: windowEnd },
    }).fetchAsync();

    for (const game of games) {
      if (!game._id) continue;
      const players = await GamePlayers.find({ gameId: game._id, status: "joined" }).fetchAsync();
      const body = `Reminder: your game starts at ${game.startsAt.toLocaleString()}.`;
      for (const p of players) {
        await notifyUser({
          userId: p.userId,
          type: "game.reminder",
          title: "Game in about 2 hours",
          body,
          entityType: "game",
          entityId: game._id,
        });
        await maybeSms(p.userId, `Dink: ${body}`);
      }
      await Games.updateAsync(game._id, { $set: { reminderSentAt: now } });
      logInfo("jobs.remindGame", { gameId: game._id, players: players.length });
    }

    if (bookings.length || games.length) {
      logInfo("jobs.remindUpcoming", {
        bookings: bookings.length,
        games: games.length,
      });
    }
  }, 60_000);

  logInfo("jobs.started");
}
