"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

type MatchRow = {
  _id: string;
  status: string;
  player1Id?: string;
  player2Id?: string;
  player1Name: string;
  player2Name: string;
};

export function TournamentActions({
  tournamentId,
  status,
  isOrganizer,
  registered,
  matches,
  userId,
}: {
  tournamentId: string;
  status: string;
  isOrganizer: boolean;
  registered: boolean;
  matches: MatchRow[];
  userId: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const playable = matches.filter(
    (m) =>
      m.status === "pending" &&
      m.player1Id &&
      m.player2Id &&
      (isOrganizer || m.player1Id === userId || m.player2Id === userId),
  );

  async function register() {
    setBusy(true);
    try {
      await clientApiFetch(`/tournaments/${tournamentId}/register`, { method: "POST", body: {} });
      logInfo("tournament.register.ok", { tournamentId });
      router.refresh();
    } catch (err) {
      logError("tournament.register.fail", { tournamentId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Register failed");
    } finally {
      setBusy(false);
    }
  }

  async function start() {
    setBusy(true);
    try {
      await clientApiFetch(`/tournaments/${tournamentId}/start`, { method: "POST", body: {} });
      logInfo("tournament.start.ok", { tournamentId });
      router.refresh();
    } catch (err) {
      logError("tournament.start.fail", { tournamentId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Start failed");
    } finally {
      setBusy(false);
    }
  }

  async function winner(matchId: string, winnerId: string) {
    setBusy(true);
    try {
      await clientApiFetch("/tournaments/matches/winner", { method: "POST", body: { matchId, winnerId } });
      logInfo("tournament.winner.ok", { matchId, winnerId });
      router.refresh();
    } catch (err) {
      logError("tournament.winner.fail", { matchId, winnerId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Report failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
      {status === "open" && !registered && (
        <button className="btn-primary" type="button" disabled={busy} onClick={register}>
          {busy ? "…" : "Register (stub pay if fee)"}
        </button>
      )}
      {status === "open" && isOrganizer && (
        <button className="btn-secondary" type="button" disabled={busy} onClick={start}>
          Start bracket
        </button>
      )}
      {playable.map((m) => (
        <div key={m._id} style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          <span style={{ fontSize: 14 }}>
            {m.player1Name} vs {m.player2Name}
          </span>
          {m.player1Id && (
            <button className="btn-secondary" type="button" disabled={busy} onClick={() => winner(m._id, m.player1Id!)}>
              {m.player1Name} wins
            </button>
          )}
          {m.player2Id && (
            <button className="btn-secondary" type="button" disabled={busy} onClick={() => winner(m._id, m.player2Id!)}>
              {m.player2Name} wins
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
