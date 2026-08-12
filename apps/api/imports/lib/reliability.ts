import { Meteor } from "meteor/meteor";
import { BookingParticipants, Bookings } from "../collections";
import { logInfo } from "./logger";

export type ReliabilityLevel = "new" | "reliable" | "highly_reliable";

export function reliabilityLevelFromCounts(
  completed: number,
  noShows: number,
): ReliabilityLevel {
  const total = completed + noShows;
  if (total < 3) return "new";
  const rate = completed / total;
  if (rate >= 0.9 && completed >= 8) return "highly_reliable";
  if (rate >= 0.7) return "reliable";
  return "new";
}

export async function bumpReliability(
  userId: string,
  kind: "complete" | "no_show",
) {
  if (!userId || userId === "unknown") return;
  const user = await Meteor.users.findOneAsync(userId);
  if (!user || user.profile?.deletedAt) return;

  const completed =
    (user.profile?.reliabilityCompleted || 0) + (kind === "complete" ? 1 : 0);
  const noShows =
    (user.profile?.reliabilityNoShows || 0) + (kind === "no_show" ? 1 : 0);
  const score = Math.round((completed / Math.max(1, completed + noShows)) * 100);
  const level = reliabilityLevelFromCounts(completed, noShows);

  await Meteor.users.updateAsync(userId, {
    $set: {
      "profile.reliabilityCompleted": completed,
      "profile.reliabilityNoShows": noShows,
      "profile.reliabilityScore": score,
      "profile.reliabilityLevel": level,
    },
  });
  logInfo("reliability.bump", { userId, kind, completed, noShows, score, level });
}

export async function bumpReliabilityMany(
  userIds: string[],
  kind: "complete" | "no_show",
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const id of unique) {
    await bumpReliability(id, kind);
  }
}

/** Apply once per booking when venue/admin marks completed or late cancel. */
export async function applyBookingReliability(
  bookingId: string,
  nextStatus: string,
  previousStatus: string,
) {
  const booking = await Bookings.findOneAsync(bookingId);
  if (!booking || booking.reliabilityApplied) {
    logInfo("reliability.booking.skip", { bookingId, reason: "missing_or_applied" });
    return;
  }

  const parts = await BookingParticipants.find({ bookingId }).fetchAsync();
  const ids = parts.map((p) => p.userId);

  if (nextStatus === "completed" && previousStatus !== "completed") {
    await bumpReliabilityMany(ids, "complete");
    await Bookings.updateAsync(bookingId, { $set: { reliabilityApplied: true } });
    logInfo("reliability.booking.complete", { bookingId, count: ids.length });
    return;
  }

  const late =
    booking.startsAt.getTime() - Date.now() <= 2 * 60 * 60 * 1000 ||
    booking.startsAt.getTime() <= Date.now();
  if (nextStatus === "cancelled" && previousStatus === "confirmed" && late) {
    await bumpReliabilityMany(ids, "no_show");
    await Bookings.updateAsync(bookingId, { $set: { reliabilityApplied: true } });
    logInfo("reliability.booking.no_show", { bookingId, count: ids.length });
  }
}
