"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

type LatestPayment = {
  _id?: string;
  status: string;
  provider: string;
  checkoutUrl?: string;
} | null;

type Props = {
  bookingId: string;
  venueId: string;
  status: string;
  latestPayment?: LatestPayment;
};

export function BookingPaymentActions({ bookingId, venueId, status, latestPayment }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const paymentFailed = latestPayment?.status === "failed";
  const canRetry = status === "pending_payment";
  const expired = status === "expired";

  async function retryPay() {
    setBusy(true);
    setMessage(null);
    try {
      const checkout = await clientApiFetch<{
        mode: "instant" | "redirect";
        checkoutUrl?: string | null;
        booking: { _id: string; status: string };
        reused?: boolean;
      }>(`/bookings/${bookingId}/checkout`, { method: "POST", body: {} });

      logInfo("booking.retryCheckout", {
        bookingId,
        mode: checkout.mode,
        reused: checkout.reused || false,
      });

      if (checkout.mode === "redirect" && checkout.checkoutUrl) {
        setMessage(checkout.reused ? "Resuming checkout…" : "Opening checkout…");
        window.location.href = checkout.checkoutUrl;
        return;
      }

      setMessage("Payment confirmed. Refreshing…");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(false);
    }
  }

  if (expired) {
    return (
      <div style={{ marginTop: 12 }}>
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: 14 }}>
          Payment window expired — this slot was released for others.
        </p>
        <Link href={`/courts/${venueId}`} className="btn-secondary" style={{ height: 32, padding: "0 12px" }}>
          Book again
        </Link>
      </div>
    );
  }

  if (!canRetry) return null;

  return (
    <div style={{ marginTop: 12 }}>
      {paymentFailed && (
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: 14 }}>
          Last payment attempt failed. You can retry before the hold expires.
        </p>
      )}
      {!paymentFailed && latestPayment?.status === "pending" && (
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: 14 }}>
          Awaiting payment confirmation. Resume checkout if you left the payment page.
        </p>
      )}
      <button
        className="btn-primary"
        disabled={busy}
        onClick={retryPay}
        style={{ height: 32, padding: "0 14px" }}
      >
        {paymentFailed ? "Retry payment" : "Pay now"}
      </button>
      {message && <p style={{ margin: "8px 0 0", fontSize: 14 }}>{message}</p>}
    </div>
  );
}
