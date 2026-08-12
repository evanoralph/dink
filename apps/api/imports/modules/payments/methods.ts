import { check, Match } from "meteor/check";
import { Meteor } from "meteor/meteor";
import { Bookings, Payments } from "../../collections";
import { isFeatureEnabled } from "../../lib/featureFlags";
import { sendOpsAlert } from "../../lib/alerts";
import { withMethodLog, logInfo, logWarn } from "../../lib/logger";
import { incrMetric } from "../../lib/metrics";
import { applyParticipantPaid } from "../../lib/splitPay";
import { getPublicPaymentConfig } from "./providers";
import { parsePaymongoWebhookEvent } from "./providers/paymongo";
import { verifyStubWebhookSecret } from "./webhookSecurity";

async function markPaid(paymentId: string, bookingId: string, providerPaymentId?: string) {
  const now = new Date();
  const existing = await Payments.findOneAsync(paymentId);
  await Payments.updateAsync(paymentId, {
    $set: {
      status: "paid",
      updatedAt: now,
      ...(providerPaymentId
        ? {
            providerPaymentId,
            metadata: {
              ...(existing?.metadata || {}),
              paymongoPaymentId: providerPaymentId.startsWith("pay_")
                ? providerPaymentId
                : existing?.metadata?.paymongoPaymentId,
            },
          }
        : {}),
    },
  });

  const payerId = existing?.userId;
  if (payerId) {
    await applyParticipantPaid(bookingId, payerId);
  } else {
    logWarn("payments.markPaid.no_user", { paymentId, bookingId });
  }
}

async function markFailed(paymentId: string, bookingId: string) {
  const now = new Date();
  await Payments.updateAsync(paymentId, {
    $set: { status: "failed", updatedAt: now },
  });
  const booking = await Bookings.findOneAsync(bookingId);
  if (booking?.status === "confirmed") {
    logInfo("payments.markFailed.keep_confirmed", { paymentId, bookingId });
    return;
  }
  await Bookings.updateAsync(bookingId, {
    $set: { status: "pending_payment", updatedAt: now },
  });
}

Meteor.methods({
  async "payments.config"() {
    return withMethodLog("payments.config", this.userId, async () => {
      const cfg = getPublicPaymentConfig();
      const stubEnabled = await isFeatureEnabled("payments_stub", cfg.provider === "stub");
      logInfo("payments.config", { ...cfg, stubEnabled });
      return { ...cfg, stubEnabled };
    });
  },

  /**
   * Internal/stub webhook shape (local testing):
   * { providerPaymentId, status, secret }
   *
   * PayMongo events are handled via REST with signature verification first,
   * then forwarded here as { paymongo: true, event, eventId }.
   */
  async "payments.webhook"(input: {
    providerPaymentId?: string;
    status?: "paid" | "failed" | "refunded";
    secret?: string;
    paymongo?: boolean;
    event?: unknown;
    eventId?: string;
  }) {
    return withMethodLog("payments.webhook", this.userId, async () => {
      check(input, {
        providerPaymentId: Match.Optional(String),
        status: Match.Optional(String),
        secret: Match.Optional(String),
        paymongo: Match.Optional(Boolean),
        event: Match.Optional(Match.Any),
        eventId: Match.Optional(String),
      });

      // --- PayMongo path ---
      if (input.paymongo || input.event) {
        const parsed = parsePaymongoWebhookEvent(input.event || input);
        if (!parsed) {
          logWarn("payments.webhook.paymongo_unparsed");
          return { ok: true, ignored: true };
        }

        const eventId = input.eventId || parsed.eventId || `evt_${parsed.type}_${parsed.sessionId || "na"}`;

        let payment =
          (parsed.sessionId &&
            (await Payments.findOneAsync({ providerSessionId: parsed.sessionId }))) ||
          (parsed.paymentId &&
            (await Payments.findOneAsync({ providerPaymentId: parsed.paymentId }))) ||
          (parsed.bookingId &&
            (await Payments.findOneAsync({
              bookingId: parsed.bookingId,
              provider: "paymongo",
            })));

        if (!payment && parsed.bookingId) {
          payment = await Payments.findOneAsync({
            bookingId: parsed.bookingId,
            status: "pending",
          });
        }

        if (!payment) {
          logWarn("payments.webhook.payment_missing", {
            eventId,
            sessionId: parsed.sessionId,
            bookingId: parsed.bookingId,
          });
          throw new Meteor.Error("not-found", "Payment not found for webhook");
        }

        // Idempotency: already processed event or already paid
        if (payment.webhookEventIds?.includes(eventId)) {
          logInfo("payments.webhook.idempotent", { paymentId: payment._id, eventId });
          return await Payments.findOneAsync(payment._id!);
        }
        if (payment.status === "paid" && parsed.status === "paid") {
          await Payments.updateAsync(payment._id!, {
            $addToSet: { webhookEventIds: eventId },
            $set: { updatedAt: new Date() },
          });
          logInfo("payments.webhook.already_paid", { paymentId: payment._id, eventId });
          return await Payments.findOneAsync(payment._id!);
        }

        await Payments.updateAsync(payment._id!, {
          $addToSet: { webhookEventIds: eventId },
          $set: { updatedAt: new Date() },
        });

        if (parsed.status === "paid") {
          await markPaid(payment._id!, payment.bookingId, parsed.paymentId || payment.providerPaymentId);
        } else if (parsed.status === "failed") {
          await markFailed(payment._id!, payment.bookingId);
          const failCount = incrMetric("payments.webhook.failed");
          logWarn("payments.webhook.failed.alert", {
            paymentId: payment._id,
            bookingId: payment.bookingId,
            failCount,
          });
          void sendOpsAlert("Payment webhook failed", {
            paymentId: payment._id,
            bookingId: payment.bookingId,
            provider: "paymongo",
            failCount,
          });
        } else {
          logInfo("payments.webhook.ignored_type", { type: parsed.type, eventId });
        }

        logInfo("payments.webhook.ok", {
          paymentId: payment._id,
          provider: "paymongo",
          status: parsed.status,
          eventId,
        });
        return await Payments.findOneAsync(payment._id!);
      }

      // --- Stub / generic path ---
      verifyStubWebhookSecret(input.secret);
      if (!input.providerPaymentId || !input.status) {
        throw new Meteor.Error("invalid-body", "providerPaymentId and status required");
      }

      const payment = await Payments.findOneAsync({
        providerPaymentId: input.providerPaymentId,
      });
      if (!payment) throw new Meteor.Error("not-found", "Payment not found");

      const eventId = `stub_${input.providerPaymentId}_${input.status}`;
      if (payment.webhookEventIds?.includes(eventId) || payment.status === input.status) {
        logInfo("payments.webhook.idempotent", { paymentId: payment._id, eventId });
        return payment;
      }

      await Payments.updateAsync(payment._id!, {
        $addToSet: { webhookEventIds: eventId },
        $set: { status: input.status, updatedAt: new Date() },
      });

      if (input.status === "paid") {
        await markPaid(payment._id!, payment.bookingId, input.providerPaymentId);
      }
      if (input.status === "failed") {
        await markFailed(payment._id!, payment.bookingId);
        const failCount = incrMetric("payments.webhook.failed");
        logWarn("payments.webhook.failed.alert", {
          paymentId: payment._id,
          bookingId: payment.bookingId,
          failCount,
        });
        void sendOpsAlert("Payment webhook failed", {
          paymentId: payment._id,
          bookingId: payment.bookingId,
          provider: "stub",
          failCount,
        });
      }

      logInfo("payments.webhook.ok", {
        paymentId: payment._id,
        status: input.status,
        eventId,
      });
      return await Payments.findOneAsync(payment._id!);
    });
  },
});
