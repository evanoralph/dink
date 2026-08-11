import { Meteor } from "meteor/meteor";
import { logError, logInfo, logWarn } from "../../../lib/logger";

/** Create a PayMongo refund for a paid `pay_xxx` id. Amount is PHP major units. */
export async function refundPaymongoPayment(input: {
  providerPaymentId: string;
  amount: number;
  reason?: "duplicate" | "fraudulent" | "requested_by_customer" | "others";
  notes?: string;
}) {
  const secret = process.env.PAYMONGO_SECRET_KEY || "";
  if (!secret) {
    throw new Meteor.Error("payments-misconfigured", "PAYMONGO_SECRET_KEY required for refunds");
  }
  if (!input.providerPaymentId.startsWith("pay_")) {
    throw new Meteor.Error(
      "invalid-state",
      `Cannot refund PayMongo id "${input.providerPaymentId}" — need pay_… payment id from webhook`,
    );
  }

  const amountCentavos = Math.round(input.amount * 100);
  const auth = Buffer.from(`${secret}:`).toString("base64");
  const body = {
    data: {
      attributes: {
        amount: amountCentavos,
        payment_id: input.providerPaymentId,
        reason: input.reason || "requested_by_customer",
        notes: input.notes || "Dink admin refund",
      },
    },
  };

  logInfo("payments.paymongo.refund.start", {
    providerPaymentId: input.providerPaymentId,
    amountCentavos,
  });

  let res: Response;
  try {
    res = await fetch("https://api.paymongo.com/v1/refunds", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
    });
  } catch (error) {
    logError("payments.paymongo.refund.network", {
      message: error instanceof Error ? error.message : String(error),
    });
    throw new Meteor.Error("payments-upstream", "PayMongo refund unreachable");
  }

  const json = (await res.json()) as {
    data?: { id?: string; attributes?: { status?: string } };
    errors?: Array<{ detail?: string }>;
  };

  if (!res.ok || !json.data?.id) {
    logWarn("payments.paymongo.refund.fail", { status: res.status, errors: json.errors });
    throw new Meteor.Error(
      "payments-upstream",
      json.errors?.[0]?.detail || "PayMongo refund failed",
    );
  }

  logInfo("payments.paymongo.refund.ok", {
    refundId: json.data.id,
    status: json.data.attributes?.status,
  });
  return json.data;
}
