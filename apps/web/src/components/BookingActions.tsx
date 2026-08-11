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
  /** From FeatureFlags.payments_stub — server decides provider; UI stays honest. */
  paymentsStub?: boolean;
};

export function BookingActions({ venueId, slots, paymentsStub = true }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const open = slots.filter((s) => s.available).slice(0, 12);

  useEffect(() => {
    logDebug("bookingActions.mount", { venueId, paymentsStub, openSlots: open.length });
  }, [venueId, paymentsStub, open.length]);

  async function book(slot: Slot) {
    setBusy(slot.startsAt + slot.courtId);
    setMessage(null);
    try {
      if (!paymentsStub) {
        logInfo("booking.checkout.blocked_ui", { venueId, reason: "payments_stub_disabled" });
        setMessage("Live payments are not available yet. Stub checkout is currently disabled.");
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

      // Provider resolved server-side from FeatureFlags + PAYMENT_PROVIDER.
      const checkout = await clientApiFetch<{ booking: { _id: string } }>(
        `/bookings/${booking._id}/checkout`,
        { method: "POST", body: {} },
      );
      logInfo("booking.checkedOut", { bookingId: checkout.booking._id, paymentsStub });
      setMessage(paymentsStub ? "Booked and paid (pilot stub). Redirecting…" : "Booked. Redirecting…");
      router.push("/bookings");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Booking failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      {paymentsStub && (
        <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
          Pilot checkout: payment is confirmed instantly via stub provider (feature flag{" "}
          <code>payments_stub</code>).
        </p>
      )}
      {!paymentsStub && (
        <p style={{ marginBottom: 12, color: "var(--text-muted)", fontSize: 14 }}>
          Live payment checkout is required. Stub payments are disabled until a real provider is wired.
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
                disabled={!paymentsStub || busy === slot.startsAt + slot.courtId}
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
