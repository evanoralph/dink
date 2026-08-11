export type PaymentProviderName = "stub" | "paymongo";

export type CreateCheckoutInput = {
  bookingId: string;
  paymentId: string;
  amount: number;
  currency: string;
  description: string;
  successUrl: string;
  cancelUrl: string;
  customerEmail?: string;
};

export type CreateCheckoutResult = {
  mode: "instant" | "redirect";
  providerPaymentId: string;
  providerSessionId?: string;
  checkoutUrl?: string;
  /** Instant providers may mark paid immediately (stub only). */
  status: "pending" | "paid";
  raw?: Record<string, unknown>;
};

export interface PaymentProvider {
  name: PaymentProviderName;
  createCheckout(input: CreateCheckoutInput): Promise<CreateCheckoutResult>;
}
