import { Meteor } from "meteor/meteor";
import { logError, logInfo, logWarn } from "../../../lib/logger";
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentProvider } from "./types";

const PAYMONGO_API = "https://api.paymongo.com/v2/checkout_sessions";

function secretKey() {
  return process.env.PAYMONGO_SECRET_KEY || "";
}

function assertConfigured() {
  if (!secretKey()) {
    throw new Meteor.Error(
      "payments-misconfigured",
      "PAYMENT_PROVIDER=paymongo requires PAYMONGO_SECRET_KEY",
    );
  }
}

/** Amounts in PayMongo are centavos (PHP * 100). */
function toCentavos(amount: number, currency: string) {
  if (currency.toUpperCase() !== "PHP") {
    throw new Meteor.Error("invalid-currency", "PayMongo checkout currently supports PHP only");
  }
  return Math.round(amount * 100);
}

export const paymongoProvider: PaymentProvider = {
  name: "paymongo",
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    assertConfigured();
    const amount = toCentavos(input.amount, input.currency);
    const body = {
      data: {
        attributes: {
          send_email_receipt: false,
          show_description: true,
          show_line_items: true,
          description: input.description,
          line_items: [
            {
              name: input.description,
              quantity: 1,
              amount,
              currency: "PHP",
            },
          ],
          payment_method_types: ["gcash", "paymaya", "card", "qrph"],
          success_url: input.successUrl,
          cancel_url: input.cancelUrl,
          reference_number: input.bookingId,
          metadata: {
            bookingId: input.bookingId,
            paymentId: input.paymentId,
          },
        },
      },
    };

    logInfo("payments.paymongo.checkout.start", {
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      amountCentavos: amount,
    });

    const auth = Buffer.from(`${secretKey()}:`).toString("base64");
    let res: Response;
    try {
      res = await fetch(PAYMONGO_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(body),
      });
    } catch (error) {
      logError("payments.paymongo.checkout.network", {
        message: error instanceof Error ? error.message : String(error),
      });
      throw new Meteor.Error("payments-upstream", "PayMongo unreachable");
    }

    const json = (await res.json()) as {
      data?: {
        id?: string;
        attributes?: { checkout_url?: string; [k: string]: unknown };
      };
      errors?: Array<{ detail?: string; code?: string }>;
    };

    if (!res.ok || !json.data?.id || !json.data.attributes?.checkout_url) {
      logWarn("payments.paymongo.checkout.fail", {
        status: res.status,
        errors: json.errors,
      });
      throw new Meteor.Error(
        "payments-upstream",
        json.errors?.[0]?.detail || "PayMongo checkout session failed",
      );
    }

    logInfo("payments.paymongo.checkout.ok", {
      bookingId: input.bookingId,
      sessionId: json.data.id,
    });

    return {
      mode: "redirect",
      providerPaymentId: json.data.id,
      providerSessionId: json.data.id,
      checkoutUrl: json.data.attributes.checkout_url,
      status: "pending",
      raw: json.data as unknown as Record<string, unknown>,
    };
  },
};

export function parsePaymongoWebhookEvent(body: unknown): {
  eventId: string;
  type: string;
  sessionId?: string;
  paymentId?: string;
  bookingId?: string;
  status: "paid" | "failed" | null;
} | null {
  const root = body as {
    data?: {
      id?: string;
      type?: string;
      attributes?: { type?: string; data?: unknown };
    };
  };

  // PayMongo wraps as data.type = event type, data.attributes.data = resource
  const eventType =
    root?.data?.attributes?.type ||
    (root as { data?: { type?: string } })?.data?.type ||
    "";
  const eventId = root?.data?.id || "";
  if (!eventType) return null;

  const resource = (root?.data?.attributes?.data || root?.data) as {
    id?: string;
    attributes?: {
      reference_number?: string;
      metadata?: { bookingId?: string; paymentId?: string };
      payments?: Array<{ id?: string; attributes?: { status?: string } }>;
      status?: string;
      payment_intent?: { id?: string };
    };
  };

  const sessionId = resource?.id;
  const bookingId =
    resource?.attributes?.metadata?.bookingId ||
    resource?.attributes?.reference_number;
  const paymentId =
    resource?.attributes?.payments?.[0]?.id ||
    resource?.attributes?.payment_intent?.id ||
    resource?.attributes?.metadata?.paymentId;

  let status: "paid" | "failed" | null = null;
  if (
    eventType.includes("payment.paid") ||
    eventType === "checkout_session.payment.paid" ||
    resource?.attributes?.payments?.[0]?.attributes?.status === "paid"
  ) {
    status = "paid";
  } else if (eventType.includes("payment.failed") || eventType.includes("failed")) {
    status = "failed";
  }

  return { eventId, type: eventType, sessionId, paymentId, bookingId, status };
}
