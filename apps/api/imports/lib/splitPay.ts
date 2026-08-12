import { BookingParticipants, Bookings } from "../collections";
import { track } from "./analytics";
import { logInfo } from "./logger";
import { notifyUser, notifyUsers } from "../modules/notifications/service";

/** P2-01: split only when 2+ payers exist. Solo organizer checkout stays unchanged. */
export function isSplitRoster(count: number) {
  return count >= 2;
}

export async function rebalanceShares(bookingId: string) {
  const booking = await Bookings.findOneAsync(bookingId);
  if (!booking) return;
  const parts = await BookingParticipants.find({ bookingId }).fetchAsync();
  if (!parts.length) return;

  const paid = parts.filter((p) => p.paymentStatus === "paid");
  const unpaid = parts.filter((p) => p.paymentStatus !== "paid");
  const paidSum = paid.reduce((sum, p) => sum + (p.paymentShare || 0), 0);
  const remaining = Math.max(0, booking.total - paidSum);
  const n = unpaid.length || 1;
  const base = Math.floor(remaining / n);
  let rem = remaining - base * n;

  for (const p of unpaid) {
    const extra = rem > 0 ? 1 : 0;
    if (rem > 0) rem -= 1;
    await BookingParticipants.updateAsync(p._id!, { $set: { paymentShare: base + extra } });
  }
  logInfo("bookings.shares.rebalance", {
    bookingId,
    payers: parts.length,
    unpaid: unpaid.length,
    remaining,
  });
}

/**
 * Mark one participant paid, then confirm booking when policy is met:
 * - 1 payer → confirm immediately (stub-safe)
 * - 2+ payers → confirm when every share is paid
 */
export async function applyParticipantPaid(bookingId: string, userId: string) {
  await BookingParticipants.updateAsync(
    { bookingId, userId },
    { $set: { paymentStatus: "paid" } },
  );

  const booking = await Bookings.findOneAsync(bookingId);
  const parts = await BookingParticipants.find({ bookingId }).fetchAsync();
  const split = isSplitRoster(parts.length);
  const paidCount = parts.filter((p) => p.paymentStatus === "paid").length;
  const allPaid = parts.length > 0 && paidCount === parts.length;

  logInfo("payments.markPaid.participant", {
    bookingId,
    userId,
    split,
    paidCount,
    roster: parts.length,
  });

  if (!booking) return { confirmed: false, split, paidCount, roster: parts.length };

  if (!split || allPaid) {
    await Bookings.updateAsync(bookingId, {
      $set: { status: "confirmed", updatedAt: new Date() },
      $unset: { expiresAt: 1 },
    });
    logInfo("bookings.confirm.all_paid", {
      bookingId,
      split,
      paidCount,
      roster: parts.length,
    });
    track("booking_completed", {
      bookingId,
      split,
      paidCount,
      roster: parts.length,
      total: booking.total,
    });
    const ids = [...new Set(parts.map((p) => p.userId).filter(Boolean))];
    await notifyUsers(ids, {
      type: "booking.confirmed",
      title: "Booking confirmed",
      body: split
        ? `All shares paid. Court booking on ${booking.startsAt.toLocaleString()} is confirmed.`
        : `Your court booking on ${booking.startsAt.toLocaleString()} is confirmed. Total ₱${booking.total}.`,
      entityType: "booking",
      entityId: bookingId,
    });
    return { confirmed: true, split, paidCount, roster: parts.length };
  }

  await notifyUser({
    userId,
    type: "booking.share_paid",
    title: "Your share is paid",
    body: `Share recorded (${paidCount}/${parts.length}). Booking confirms when everyone pays.`,
    entityType: "booking",
    entityId: bookingId,
  });
  if (booking.creatorUserId && booking.creatorUserId !== userId) {
    await notifyUser({
      userId: booking.creatorUserId,
      type: "booking.share_paid",
      title: "A player paid their share",
      body: `${paidCount}/${parts.length} paid for ${booking.startsAt.toLocaleString()}.`,
      entityType: "booking",
      entityId: bookingId,
    });
  }
  return { confirmed: false, split, paidCount, roster: parts.length };
}
