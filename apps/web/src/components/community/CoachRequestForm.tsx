"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function CoachRequestForm({ coachUserId }: { coachUserId: string }) {
  const router = useRouter();
  const [startsAt, setStartsAt] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    const iso = startsAt ? new Date(startsAt).toISOString() : "";
    logInfo("coach.request.submit", { coachUserId });
    try {
      await clientApiFetch("/coaches/requests", {
        method: "POST",
        body: { coachUserId, startsAt: iso, note: note || undefined },
      });
      logInfo("coach.request.ok", { coachUserId });
      setMessage("Request sent — coach will confirm in Alerts.");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage(msg);
      logError("coach.request.fail", { message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, marginTop: 16, display: "grid", gap: 12 }}>
      <strong>Request a session</strong>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600 }}>When</span>
        <input className="input" type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} required />
      </label>
      <textarea className="input" rows={2} placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
      {message && <p style={{ margin: 0 }}>{message}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
