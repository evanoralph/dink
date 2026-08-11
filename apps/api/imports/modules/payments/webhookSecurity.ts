import crypto from "crypto";
import { Meteor } from "meteor/meteor";
import { logDebug, logWarn } from "../../lib/logger";
import { assertWebhookSecretSafe, getWebhookSecret } from "./providers";

/**
 * Verify PayMongo-Signature header when present.
 * Format: t=<timestamp>,te=<test_hmac>,li=<live_hmac>
 * Signed payload: `${timestamp}.${rawBody}`
 */
export function verifyPaymongoSignature(rawBody: string, signatureHeader: string | undefined) {
  const secret = getWebhookSecret();
  assertWebhookSecretSafe(secret || "dev-webhook-secret");

  if (!signatureHeader) {
    // Fall back to shared-secret body field for stub/local webhooks.
    return { mode: "unsigned" as const };
  }

  if (!secret) {
    logWarn("payments.webhook.missing_secret");
    throw new Meteor.Error("forbidden", "Webhook secret not configured");
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((p) => {
      const [k, v] = p.trim().split("=");
      return [k, v];
    }),
  ) as Record<string, string>;

  const timestamp = parts.t;
  const testSig = parts.te;
  const liveSig = parts.li;
  if (!timestamp || (!testSig && !liveSig)) {
    logWarn("payments.webhook.bad_signature_header");
    throw new Meteor.Error("forbidden", "Invalid Paymongo-Signature header");
  }

  const signedPayload = `${timestamp}.${rawBody}`;
  const expected = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");
  const candidates = [testSig, liveSig].filter(Boolean);
  const ok = candidates.some((sig) => timingSafeEqualHex(sig, expected));
  if (!ok) {
    logWarn("payments.webhook.signature_mismatch");
    throw new Meteor.Error("forbidden", "Invalid webhook signature");
  }

  logDebug("payments.webhook.signature_ok", { timestamp });
  return { mode: "paymongo" as const, timestamp };
}

function timingSafeEqualHex(a: string, b: string) {
  try {
    const ba = Buffer.from(a, "hex");
    const bb = Buffer.from(b, "hex");
    if (ba.length !== bb.length) return false;
    return crypto.timingSafeEqual(ba, bb);
  } catch {
    return false;
  }
}

export function verifyStubWebhookSecret(provided?: string) {
  const expected = getWebhookSecret() || "dev-webhook-secret";
  assertWebhookSecretSafe(expected);
  if (provided !== expected) {
    logWarn("payments.webhook.badSecret");
    throw new Meteor.Error("forbidden", "Invalid webhook secret");
  }
}
