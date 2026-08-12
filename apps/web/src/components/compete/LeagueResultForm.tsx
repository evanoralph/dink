"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function LeagueResultForm({
  leagueId,
  opponents,
}: {
  leagueId: string;
  opponents: Array<{ userId: string; displayName: string }>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await clientApiFetch(`/leagues/${leagueId}/results`, {
        method: "POST",
        body: {
          opponentUserId: String(fd.get("opponentUserId")),
          team1Sets: Number(fd.get("team1Sets")),
          team2Sets: Number(fd.get("team2Sets")),
        },
      });
      logInfo("league.result.ok", { leagueId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, marginTop: 16, display: "grid", gap: 10 }}>
      <strong>Record a result (you are team 1)</strong>
      <select className="input" name="opponentUserId" required>
        {opponents.map((o) => (
          <option key={o.userId} value={o.userId}>
            {o.displayName}
          </option>
        ))}
      </select>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <input className="input" name="team1Sets" type="number" min={0} defaultValue={2} required />
        <input className="input" name="team2Sets" type="number" min={0} defaultValue={0} required />
      </div>
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save result"}
      </button>
    </form>
  );
}
