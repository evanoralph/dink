import { Meteor } from "meteor/meteor";
import type { BookingDoc } from "../collections";
import { logDebug } from "./logger";

/** Confirmed bookings can be cancelled only if start is this many hours away. */
export const CANCEL_CONFIRMED_MIN_HOURS = Number(
  process.env.CANCEL_CONFIRMED_MIN_HOURS || 2,
);

export function assertBookingCancellable(booking: BookingDoc, isAdmin: boolean) {
  if (isAdmin) {
    logDebug("cancelPolicy.admin_bypass", { bookingId: booking._id });
    return { allowed: true as const, reason: "admin" };
  }

  if (booking.status === "pending_payment") {
    return { allowed: true as const, reason: "unpaid_hold" };
  }

  if (booking.status !== "confirmed") {
    throw new Meteor.Error(
      "invalid-state",
      `Cannot cancel booking in status ${booking.status}`,
    );
  }

  const msUntilStart = booking.startsAt.getTime() - Date.now();
  const minMs = CANCEL_CONFIRMED_MIN_HOURS * 60 * 60 * 1000;
  if (msUntilStart < minMs) {
    throw new Meteor.Error(
      "cancel-too-late",
      `Confirmed bookings can only be cancelled at least ${CANCEL_CONFIRMED_MIN_HOURS} hours before start. Contact support for refunds.`,
    );
  }

  return { allowed: true as const, reason: "confirmed_outside_window" };
}

export function cancelPolicyCopy() {
  return {
    unpaid: "Unpaid holds can be cancelled anytime before they expire.",
    confirmed: `Confirmed bookings can be cancelled until ${CANCEL_CONFIRMED_MIN_HOURS} hours before start. Paid refunds are handled by support/admin.`,
    tooLate: "Inside the cancel window — cancel is blocked; contact support.",
  };
}
