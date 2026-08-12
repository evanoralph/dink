"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function InviteToPayForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    logInfo("booking.invite.submit", { bookingId });
    try {
      await clientApiFetch(`/bookings/${bookingId}/invite`, {
        method: "POST",
        body: { email },
      });
      logInfo("booking.invite.ok", { bookingId });
      setEmail("");
      setMessage("Invite sent");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invite failed";
      setMessage(msg);
      logError("booking.invite.fail", { bookingId, message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gap: 10, marginTop: 16 }}>
      <strong>Invite to pay</strong>
      <input
        className="input"
        type="email"
        placeholder="player@email.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      {message && <p style={{ margin: 0, fontSize: 14 }}>{message}</p>}
      <button className="btn-secondary" type="submit" disabled={busy}>
        {busy ? "Inviting…" : "Send invite"}
      </button>
    </form>
  );
}

export function RemindUnpaidButton({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remind() {
    setBusy(true);
    logInfo("booking.remind.submit", { bookingId });
    try {
      const res = await clientApiFetch<{ reminded: number }>(`/bookings/${bookingId}/remind`, {
        method: "POST",
        body: {},
      });
      logInfo("booking.remind.ok", { bookingId, reminded: res.reminded });
      alert(res.reminded ? `Reminded ${res.reminded} player(s)` : "No unpaid invitees");
      router.refresh();
    } catch (err) {
      logError("booking.remind.fail", {
        bookingId,
        message: err instanceof Error ? err.message : "unknown",
      });
      alert(err instanceof Error ? err.message : "Remind failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-secondary" type="button" onClick={remind} disabled={busy}>
      {busy ? "Sending…" : "Remind unpaid"}
    </button>
  );
}
