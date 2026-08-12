"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

type Entry = { userId: string; displayName: string; rank: number };
type Challenge = {
  _id: string;
  challengerId: string;
  defenderId: string;
  status: string;
  challengerName: string;
  defenderName: string;
};

export function LadderActions({
  ladderId,
  userId,
  myRank,
  entries,
  challenges,
}: {
  ladderId: string;
  userId: string;
  myRank: number;
  entries: Entry[];
  challenges: Challenge[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const targets = entries.filter((e) => e.userId !== userId && e.rank < myRank && myRank - e.rank <= 3);
  const incoming = challenges.filter((c) => c.defenderId === userId && c.status === "pending");
  const accepted = challenges.filter(
    (c) => c.status === "accepted" && (c.challengerId === userId || c.defenderId === userId),
  );

  async function challenge(defenderId: string) {
    setBusy(true);
    try {
      await clientApiFetch(`/ladders/${ladderId}/challenge`, { method: "POST", body: { defenderId } });
      logInfo("ladder.challenge.ok", { ladderId, defenderId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function respond(challengeId: string, status: "accepted" | "declined") {
    setBusy(true);
    try {
      await clientApiFetch("/ladders/challenges/respond", { method: "POST", body: { challengeId, status } });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function result(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await clientApiFetch("/ladders/challenges/result", {
        method: "POST",
        body: {
          challengeId: String(fd.get("challengeId")),
          challengerSets: Number(fd.get("challengerSets")),
          defenderSets: Number(fd.get("defenderSets")),
        },
      });
      logInfo("ladder.result.ok", { ladderId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 16, marginTop: 16 }}>
      <div className="card" style={{ padding: 20 }}>
        <strong>Challenge</strong>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          {targets.map((t) => (
            <button key={t.userId} className="btn-secondary" type="button" disabled={busy} onClick={() => challenge(t.userId)}>
              #{t.rank} {t.displayName}
            </button>
          ))}
          {targets.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>No eligible ranks above you</p>}
        </div>
      </div>
      {incoming.length > 0 && (
        <div className="card" style={{ padding: 20 }}>
          <strong>Incoming</strong>
          {incoming.map((c) => (
            <div key={c._id} style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <span>{c.challengerName} challenged you</span>
              <button className="btn-primary" type="button" disabled={busy} onClick={() => respond(c._id, "accepted")}>
                Accept
              </button>
              <button className="btn-secondary" type="button" disabled={busy} onClick={() => respond(c._id, "declined")}>
                Decline
              </button>
            </div>
          ))}
        </div>
      )}
      {accepted.length > 0 && (
        <form onSubmit={result} className="card" style={{ padding: 20, display: "grid", gap: 10 }}>
          <strong>Report challenge result</strong>
          <select className="input" name="challengeId" required>
            {accepted.map((c) => (
              <option key={c._id} value={c._id}>
                {c.challengerName} vs {c.defenderName}
              </option>
            ))}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <input className="input" name="challengerSets" type="number" min={0} defaultValue={2} required />
            <input className="input" name="defenderSets" type="number" min={0} defaultValue={0} required />
          </div>
          <button className="btn-primary" type="submit" disabled={busy}>
            Save result
          </button>
        </form>
      )}
    </div>
  );
}
