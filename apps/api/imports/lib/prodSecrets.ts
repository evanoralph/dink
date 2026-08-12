import { getWebhookSecret } from "../modules/payments/providers";
import { isProdLikeRuntime } from "./seedPolicy";
import { logError, logInfo } from "./logger";

const WEAK = new Set(["", "dev-webhook-secret", "changeme", "secret", "password"]);

/**
 * P1-21: refuse to boot prod-like environments with insecure defaults.
 * Throws Error (not Meteor.Error) so startup fails hard.
 */
export function assertProdSecretsOrThrow() {
  if (!isProdLikeRuntime()) {
    logInfo("prodSecrets.skip", { reason: "not_prod_like" });
    return;
  }

  const problems: string[] = [];
  const webhook = getWebhookSecret();
  if (WEAK.has(webhook) || webhook.length < 16) {
    problems.push("PAYMENT_WEBHOOK_SECRET/PAYMONGO_WEBHOOK_SECRET is weak or missing");
  }

  if (process.env.SEED_ON_STARTUP === "true") {
    const defaults = ["Admin123!", "Owner123!", "Player123!"];
    const pw = [
      process.env.SEED_ADMIN_PASSWORD || "Admin123!",
      process.env.SEED_OWNER_PASSWORD || "Owner123!",
      process.env.SEED_PLAYER_PASSWORD || "Player123!",
    ];
    if (pw.some((p) => defaults.includes(p))) {
      problems.push("SEED_ON_STARTUP=true with default seed passwords");
    }
  }

  if (process.env.PAYMENT_PROVIDER === "paymongo" && !process.env.PAYMONGO_SECRET_KEY) {
    problems.push("PAYMENT_PROVIDER=paymongo without PAYMONGO_SECRET_KEY");
  }

  if (problems.length) {
    logError("prodSecrets.fail", { problems });
    throw new Error(`Insecure production configuration: ${problems.join("; ")}`);
  }

  logInfo("prodSecrets.ok", { checked: true });
}
