"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function MatchResultForm({
  gameId,
  playerIds,
}: {
  gameId: string;
  playerIds: string[];
}) {
  const router = useRouter();
  const [t1, setT1] = useState(11);
  const [t2, setT2] = useState(8);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const mid = Math.ceil(playerIds.length / 2) || 1;
    const team1UserIds = playerIds.slice(0, mid);
    const team2UserIds = playerIds.slice(mid);
    try {
      await clientApiFetch("/matches", {
        method: "POST",
        body: {
          gameId,
          sets: [{ setNumber: 1, team1Score: t1, team2Score: t2 }],
          team1UserIds: team1UserIds.length ? team1UserIds : ["unknown"],
          team2UserIds: team2UserIds.length ? team2UserIds : ["unknown"],
        },
      });
      logInfo("match.submitted", { gameId });
      setMessage("Score submitted");
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, display: "grid", gap: 12, marginTop: 20 }}>
      <strong>Log score</strong>
      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Team 1
          <input className="input" type="number" value={t1} onChange={(e) => setT1(Number(e.target.value))} />
        </label>
        <label style={{ flex: 1 }}>
          Team 2
          <input className="input" type="number" value={t2} onChange={(e) => setT2(Number(e.target.value))} />
        </label>
      </div>
      {message && <p>{message}</p>}
      <button className="btn-primary" type="submit">Submit result</button>
    </form>
  );
}
