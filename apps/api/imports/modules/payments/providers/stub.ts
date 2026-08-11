import { Random } from "meteor/random";
import { logInfo } from "../../../lib/logger";
import type { CreateCheckoutInput, CreateCheckoutResult, PaymentProvider } from "./types";

export const stubProvider: PaymentProvider = {
  name: "stub",
  async createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult> {
    const providerPaymentId = `stub_${Random.id()}`;
    logInfo("payments.stub.checkout", {
      bookingId: input.bookingId,
      paymentId: input.paymentId,
      providerPaymentId,
      amount: input.amount,
    });
    return {
      mode: "instant",
      providerPaymentId,
      status: "paid",
    };
  },
};
