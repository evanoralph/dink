"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function DisputeMatchButton({ matchId }: { matchId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await clientApiFetch(`/matches/${matchId}/dispute`, { method: "POST", body: { reason } });
      logInfo("match.dispute.ok", { matchId });
      setOpen(false);
      router.refresh();
    } catch (err) {
      logError("match.dispute.fail", { matchId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Dispute failed");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" type="button" onClick={() => setOpen(true)}>
        Dispute score
      </button>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why?" required minLength={3} />
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "…" : "Submit dispute"}
      </button>
    </form>
  );
}
