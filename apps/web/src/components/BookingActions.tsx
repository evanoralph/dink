"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logDebug, logInfo } from "@/lib/logger";

type Slot = {
  courtId: string;
  courtName: string;
  startsAt: string;
  endsAt: string;
  available: boolean;
  price: number;
  currency: string;
};

type Props = {
  venueId: string;
  slots: Slot[];
  /** From FeatureFlags.payments_stub */
  paymentsStub?: boolean;
  /** From GET /payments/config */
  paymentProvider?: string;
  redirectCheckout?: boolean;
};

type CheckoutResult = {
  booking: { _id: string; status: string };
  payment: { _id: string; status: string };
  mode: "instant" | "redirect";
  checkoutUrl?: string | null;
};

export function BookingActions({
  venueId,
  slots,
  paymentsStub = true,
  paymentProvider = "stub",
  redirectCheckout = false,
}: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const open = slots.filter((s) => s.available).slice(0, 12);
  const canCheckout = paymentsStub || redirectCheckout;

  useEffect(() => {
    logDebug("bookingActions.mount", {
      venueId,
      paymentsStub,
      paymentProvider,
      redirectCheckout,
      openSlots: open.length,
    });
  }, [venueId, paymentsStub, paymentProvider, redirectCheckout, open.length]);

  async function book(slot: Slot) {
    setBusy(slot.startsAt + slot.courtId);
    setMessage(null);
    try {
      if (!canCheckout) {
        logInfo("booking.checkout.blocked_ui", { venueId, reason: "no_provider" });
        setMessage("Checkout is unavailable. Enable stub payments or configure PayMongo.");
        return;
      }

      const booking = await clientApiFetch<{ _id: string }>("/bookings", {
        method: "POST",
        body: {
          venueId,
          courtId: slot.courtId,
          startsAt: slot.startsAt,
          endsAt: slot.endsAt,
          participantCount: 4,
          idempotencyKey: `web_${venueId}_${slot.courtId}_${slot.startsAt}`,
        },
      });
      logInfo("booking.created", { bookingId: booking._id });

      const checkout = await clientApiFetch<CheckoutResult>(`/bookings/${booking._id}/checkout`, {
        method: "POST",
        body: {},
      });
      logInfo("booking.checkedOut", {
        bookingId: checkout.booking._id,
        mode: checkout.mode,
        status: checkout.payment.status,
        provider: paymentProvider,
      });

      if (checkout.mode === "redirect" && checkout.checkoutUrl) {
        setMessage("Redirecting to secure checkout…");
        window.location.href = checkout.checkoutUrl;
        return;
      }

      setMessage(
        checkout.payment.status === "paid"
          ? "Booked and paid (pilot stub). Redirecting…"
          : "Booking created. Waiting for payment confirmation…",
      );
      router.push(`/bookings?bookingId=${checkout.booking._id}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {paymentProvider === "stub" && paymentsStub && (
        <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
          Pilot checkout: confirmed instantly via stub provider (`PAYMENT_PROVIDER=stub`).
        </p>
      )}
      {redirectCheckout && (
        <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
          Checkout uses PayMongo hosted page (GCash / Maya / card). Booking confirms after webhook.
        </p>
      )}
      {!canCheckout && (
        <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
          Payments are not configured. Set `PAYMENT_PROVIDER=paymongo` + keys, or enable `payments_stub`.
        </p>
      )}
      {message && <p style={{ marginBottom: 12 }}>{message}</p>}
      <div style={{ display: "grid", gap: 10 }}>
        {open.map((slot) => (
          <div
            key={`${slot.courtId}-${slot.startsAt}`}
            className="card"
            style={{ padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}
          >
            <div>
              <strong>{slot.courtName}</strong>
              <div style={{ color: "var(--text-muted)", fontSize: 14 }}>
                {new Date(slot.startsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                {" – "}
                {new Date(slot.endsAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>₱{slot.price}</span>
              <button
                className="btn-primary"
                disabled={!canCheckout || busy === slot.startsAt + slot.courtId}
                onClick={() => book(slot)}
                style={{ height: 36, padding: "0 14px" }}
              >
                Book
              </button>
            </div>
          </div>
        ))}
        {open.length === 0 && <p className="card" style={{ padding: 16 }}>No open slots for today.</p>}
      </div>
    </div>
  );
}
