import { Meteor } from "meteor/meteor";
import { isFeatureEnabled } from "../../../lib/featureFlags";
import { isProdLikeRuntime } from "../../../lib/seedPolicy";
import { logInfo, logWarn } from "../../../lib/logger";
import { paymongoProvider } from "./paymongo";
import { stubProvider } from "./stub";
import type { PaymentProvider, PaymentProviderName } from "./types";

const WEAK_WEBHOOK_SECRETS = new Set(["", "dev-webhook-secret", "changeme", "secret"]);

export function getConfiguredProviderName(): PaymentProviderName {
  const raw = (process.env.PAYMENT_PROVIDER || "stub").toLowerCase();
  if (raw === "paymongo") return "paymongo";
  return "stub";
}

export async function resolveCheckoutProvider(
  requested?: string,
): Promise<PaymentProvider> {
  const envProvider = getConfiguredProviderName();
  const stubEnabled = await isFeatureEnabled("payments_stub", envProvider === "stub");
  const name = (requested || envProvider).toLowerCase() as PaymentProviderName;

  logInfo("payments.provider.resolve", {
    envProvider,
    requested: requested || null,
    resolved: name,
    stubEnabled,
  });

  if (name === "stub") {
    if (!stubEnabled) {
      throw new Meteor.Error(
        "payments-unavailable",
        "Stub payments are disabled. Set PAYMENT_PROVIDER=paymongo with keys, or enable payments_stub.",
      );
    }
    return stubProvider;
  }

  if (name === "paymongo") {
    if (!process.env.PAYMONGO_SECRET_KEY) {
      throw new Meteor.Error(
        "payments-misconfigured",
        "PayMongo selected but PAYMONGO_SECRET_KEY is missing",
      );
    }
    return paymongoProvider;
  }

  throw new Meteor.Error("payments-unavailable", `Unknown payment provider "${name}"`);
}

export function getWebhookSecret(): string {
  return process.env.PAYMENT_WEBHOOK_SECRET || process.env.PAYMONGO_WEBHOOK_SECRET || "";
}

/** P1-03: reject weak/default webhook secrets in prod-like runtimes. */
export function assertWebhookSecretSafe(secret: string) {
  if (!isProdLikeRuntime()) return;
  if (WEAK_WEBHOOK_SECRETS.has(secret) || secret.length < 16) {
    logWarn("payments.webhook.weak_secret_blocked", { prodLike: true });
    throw new Meteor.Error(
      "payments-misconfigured",
      "Weak PAYMENT_WEBHOOK_SECRET rejected in production. Set a strong secret (≥16 chars).",
    );
  }
}

export function getPublicPaymentConfig() {
  const provider = getConfiguredProviderName();
  return {
    provider,
    paymongoConfigured: Boolean(process.env.PAYMONGO_SECRET_KEY),
    redirectCheckout: provider === "paymongo" && Boolean(process.env.PAYMONGO_SECRET_KEY),
  };
}
