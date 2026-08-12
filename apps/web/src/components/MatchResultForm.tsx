"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { DisputeMatchButton } from "@/components/DisputeMatchButton";
import { clientApiFetch } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { logError, logInfo } from "@/lib/logger";

export function MatchResultForm({
  gameId,
  playerIds,
}: {
  gameId: string;
  playerIds: string[];
}) {
  const router = useRouter();
  const ids = useMemo(() => playerIds.filter((id) => id && id !== "unknown"), [playerIds]);
  const mid = Math.ceil(ids.length / 2) || 0;
  const defaultT1 = ids.slice(0, mid);
  const defaultT2 = ids.slice(mid);

  const [t1, setT1] = useState(11);
  const [t2, setT2] = useState(8);
  const [team1, setTeam1] = useState<string[]>(defaultT1);
  const [team2, setTeam2] = useState<string[]>(defaultT2);
  const [message, setMessage] = useState<string | null>(null);

  function toggle(id: string, team: 1 | 2) {
    if (team === 1) {
      setTeam1((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setTeam2((prev) => prev.filter((x) => x !== id));
    } else {
      setTeam2((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
      setTeam1((prev) => prev.filter((x) => x !== id));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    // P1-26: never submit placeholder "unknown" ids
    if (ids.length < 2) {
      setMessage("Need at least 2 joined players to submit a score");
      return;
    }
    if (!team1.length || !team2.length) {
      setMessage("Assign at least one player to each team");
      return;
    }
    logInfo("match.submit", { gameId, team1: team1.length, team2: team2.length });
    try {
      await clientApiFetch("/matches", {
        method: "POST",
        body: {
          gameId,
          sets: [{ setNumber: 1, team1Score: t1, team2Score: t2 }],
          team1UserIds: team1,
          team2UserIds: team2,
        },
      });
      logInfo("match.submitted", { gameId });
      track("match_result_submitted", { gameId });
      setMessage("Score submitted — opponents can confirm below");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage(msg);
      logError("match.submit.fail", { gameId, message: msg });
    }
  }

  if (ids.length < 2) {
    return (
      <div className="card" style={{ padding: 20, marginTop: 20 }}>
        <strong>Log score</strong>
        <p style={{ color: "var(--text-muted)", marginTop: 8 }}>
          Waiting for at least 2 joined players before scoring.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 20, display: "grid", gap: 12, marginTop: 20 }}>
      <strong>Log score</strong>
      <div style={{ display: "grid", gap: 8 }}>
        {ids.map((id) => (
          <div key={id} style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <code style={{ fontSize: 12 }}>{id.slice(0, 8)}…</code>
            <button type="button" className="btn-secondary" onClick={() => toggle(id, 1)}>
              {team1.includes(id) ? "Team 1 ✓" : "Team 1"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => toggle(id, 2)}>
              {team2.includes(id) ? "Team 2 ✓" : "Team 2"}
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 12 }}>
        <label style={{ flex: 1 }}>
          Team 1
          <input
            className="input"
            type="number"
            value={t1}
            onChange={(e) => setT1(Number(e.target.value))}
          />
        </label>
        <label style={{ flex: 1 }}>
          Team 2
          <input
            className="input"
            type="number"
            value={t2}
            onChange={(e) => setT2(Number(e.target.value))}
          />
        </label>
      </div>
      {message && <p>{message}</p>}
      <button className="btn-primary" type="submit">
        Submit result
      </button>
    </form>
  );
}

type MatchDoc = {
  _id: string;
  status: string;
  team1UserIds: string[];
  team2UserIds: string[];
  confirmedBy?: string[];
  submittedBy?: string;
  disputed?: boolean;
};

/** P1-24 */
export function MatchConfirmPanel({
  match,
  sets,
  currentUserId,
}: {
  match: MatchDoc;
  sets: Array<{ setNumber: number; team1Score: number; team2Score: number }>;
  currentUserId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const participants = [...match.team1UserIds, ...match.team2UserIds];
  const isParticipant = participants.includes(currentUserId);
  const already = (match.confirmedBy || []).includes(currentUserId);

  async function confirm() {
    setBusy(true);
    logInfo("match.confirm.submit", { matchId: match._id });
    try {
      await clientApiFetch(`/matches/${match._id}/confirm`, { method: "POST", body: {} });
      logInfo("match.confirm.ok", { matchId: match._id });
      track("match_result_confirmed", { matchId: match._id });
      setMessage("Confirmed");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage(msg);
      logError("match.confirm.fail", { matchId: match._id, message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginTop: 20, display: "grid", gap: 10 }}>
      <strong>Match result · {match.status}</strong>
      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-muted)" }}>
        {sets.map((s) => (
          <li key={s.setNumber}>
            Set {s.setNumber}: {s.team1Score}–{s.team2Score}
          </li>
        ))}
      </ul>
      <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>
        Confirmed by {(match.confirmedBy || []).length}/{participants.length} players
      </p>
      {isParticipant && match.status !== "confirmed" && (
        <button
          className="btn-primary"
          type="button"
          onClick={confirm}
          disabled={busy || already}
        >
          {already ? "You confirmed" : busy ? "Confirming…" : "Confirm score"}
        </button>
      )}
      {isParticipant && !match.disputed && match.status !== "voided" && (
        <DisputeMatchButton matchId={match._id} />
      )}
      {match.disputed && (
        <p style={{ margin: 0, fontSize: 14, color: "var(--text-muted)" }}>Score disputed — admin will review</p>
      )}
      {message && <p>{message}</p>}
    </div>
  );
}
