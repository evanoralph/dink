import { check } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Bookings, Courts } from "../../collections";
import { logDebug } from "../../lib/logger";

Meteor.publish("venues.courtBoard", function (venueId: string) {
  check(venueId, String);
  logDebug("pub.venues.courtBoard", { userId: this.userId, venueId });
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return [
    Courts.find({ venueId, active: true }),
    Bookings.find({
      venueId,
      status: { $in: ["pending_payment", "confirmed"] },
      startsAt: { $gte: start, $lte: end },
    }),
  ];
});
