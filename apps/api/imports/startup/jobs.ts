import { Meteor } from "meteor/meteor";
import { Bookings } from "../collections";
import { logInfo } from "../lib/logger";

let started = false;

export function startJobs() {
  if (started) return;
  started = true;

  // Expire unpaid pending bookings every minute
  Meteor.setInterval(async () => {
    const now = new Date();
    const expired = await Bookings.updateAsync(
      {
        status: "pending_payment",
        expiresAt: { $lte: now },
      },
      {
        $set: { status: "expired", updatedAt: now },
      },
      { multi: true },
    );
    if (expired > 0) {
      logInfo("jobs.expireBookings", { count: expired });
    }
  }, 60_000);

  logInfo("jobs.started");
}
