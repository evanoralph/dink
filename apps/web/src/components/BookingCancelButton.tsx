"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

type Props = {
  bookingId: string;
  status: string;
  policyHint?: string;
};

export function BookingCancelButton({ bookingId, status, policyHint }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!["pending_payment", "confirmed"].includes(status)) return null;

  async function cancel() {
    if (!confirm("Cancel this booking?")) return;
    setBusy(true);
    setMessage(null);
    try {
      await clientApiFetch(`/bookings/${bookingId}/cancel`, { method: "POST", body: {} });
      logInfo("booking.cancelled", { bookingId, status });
      setMessage("Cancelled.");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Cancel failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 10 }}>
      {policyHint && (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "var(--text-muted)" }}>{policyHint}</p>
      )}
      <button
        className="btn-secondary"
        disabled={busy}
        onClick={cancel}
        style={{ height: 32, padding: "0 14px" }}
      >
        Cancel booking
      </button>
      {message && <p style={{ margin: "8px 0 0", fontSize: 14 }}>{message}</p>}
    </div>
  );
}
