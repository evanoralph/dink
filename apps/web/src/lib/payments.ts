import { apiFetch } from "./api";
import { logInfo, logWarn } from "./logger";

export type PaymentConfig = {
  provider: "stub" | "paymongo" | string;
  paymongoConfigured: boolean;
  redirectCheckout: boolean;
  stubEnabled: boolean;
};

const DEFAULT_CONFIG: PaymentConfig = {
  provider: "stub",
  paymongoConfigured: false,
  redirectCheckout: false,
  stubEnabled: true,
};

export async function getPaymentConfig(): Promise<PaymentConfig> {
  try {
    const cfg = await apiFetch<PaymentConfig>("/api/v1/payments/config");
    logInfo("payments.config.web", cfg);
    return { ...DEFAULT_CONFIG, ...cfg };
  } catch (error) {
    logWarn("payments.config.web.fail", {
      message: error instanceof Error ? error.message : String(error),
    });
    return { ...DEFAULT_CONFIG };
  }
}
