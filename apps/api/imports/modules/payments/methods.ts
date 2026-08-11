import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Bookings, Payments } from "../../collections";
import { withMethodLog, logInfo, logWarn } from "../../lib/logger";

Meteor.methods({
  async "payments.webhook"(input: {
    providerPaymentId: string;
    status: "paid" | "failed" | "refunded";
    secret?: string;
  }) {
    return withMethodLog("payments.webhook", this.userId, async () => {
      check(input, {
        providerPaymentId: String,
        status: String,
        secret: Match.Optional(String),
      });
      const expected = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
      if (input.secret !== expected) {
        logWarn("payments.webhook.badSecret");
        throw new Meteor.Error("forbidden", "Invalid webhook secret");
      }
      const payment = await Payments.findOneAsync({
        providerPaymentId: input.providerPaymentId,
      });
      if (!payment) throw new Meteor.Error("not-found", "Payment not found");
      await Payments.updateAsync(payment._id!, {
        $set: { status: input.status, updatedAt: new Date() },
      });
      if (input.status === "paid") {
        await Bookings.updateAsync(payment.bookingId, {
          $set: { status: "confirmed", updatedAt: new Date() },
        });
      }
      if (input.status === "failed") {
        await Bookings.updateAsync(payment.bookingId, {
          $set: { status: "pending_payment", updatedAt: new Date() },
        });
      }
      logInfo("payments.webhook.ok", {
        paymentId: payment._id,
        status: input.status,
      });
      return await Payments.findOneAsync(payment._id!);
    });
  },
});
