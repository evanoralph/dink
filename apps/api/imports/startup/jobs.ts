import { Meteor } from "meteor/meteor";
import { BookingParticipants, Bookings, Payments } from "../collections";
import { logInfo } from "../lib/logger";

let started = false;

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

    logInfo("jobs.expireBookings", {
      count: expired,
      bookingIds: ids,
      paymentsFailed,
      note: "slots released — expired bookings no longer block availability",
    });
  }, 60_000);

  logInfo("jobs.started");
}
