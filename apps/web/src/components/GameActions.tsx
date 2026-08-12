"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { Game, Venue } from "@/lib/types";
import { track } from "@/lib/analytics";
import { logError, logInfo } from "@/lib/logger";

export function CreateGameForm({ venues, groupId }: { venues: Venue[]; groupId?: string }) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?._id || "");
  const [format, setFormat] = useState<"singles" | "doubles">("doubles");
  const [skillMin, setSkillMin] = useState(3);
  const [skillMax, setSkillMax] = useState(4);
  const [capacity, setCapacity] = useState(4);
  const [pricePerPlayer, setPricePerPlayer] = useState(250);
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    logInfo("game.create.submit", { venueId, format, skillMin, skillMax, capacity, groupId });
    try {
      const game = await clientApiFetch<Game>("/games", {
        method: "POST",
        body: {
          venueId,
          startsAt,
          format,
          skillMin,
          skillMax,
          capacity,
          pricePerPlayer,
          visibility: "public",
          groupId,
        },
      });
      logInfo("game.created", { gameId: game._id });
      track("game_created", { gameId: game._id, venueId, format });
      router.push(`/games/${game._id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage(msg);
      logError("game.create.fail", { message: msg });
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
      <strong>{groupId ? "Post open play to this group" : "Create a game"}</strong>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Venue</span>
        <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)} required>
          {venues.map((v) => (
            <option key={v._id} value={v._id}>
              {v.name}
            </option>
          ))}
        </select>
      </label>
      <label style={{ display: "grid", gap: 6 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>Format</span>
        <select
          className="input"
          value={format}
          onChange={(e) => {
            const next = e.target.value as "singles" | "doubles";
            setFormat(next);
            setCapacity(next === "singles" ? 2 : 4);
          }}
        >
          <option value="doubles">Doubles</option>
          <option value="singles">Singles</option>
        </select>
      </label>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Skill min</span>
          <input
            className="input"
            type="number"
            step="0.5"
            min={2}
            max={5.5}
            value={skillMin}
            onChange={(e) => setSkillMin(Number(e.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Skill max</span>
          <input
            className="input"
            type="number"
            step="0.5"
            min={2}
            max={5.5}
            value={skillMax}
            onChange={(e) => setSkillMax(Number(e.target.value))}
            required
          />
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Capacity</span>
          <input
            className="input"
            type="number"
            min={2}
            max={8}
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            required
          />
        </label>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Price / player</span>
          <input
            className="input"
            type="number"
            min={0}
            value={pricePerPlayer}
            onChange={(e) => setPricePerPlayer(Number(e.target.value))}
          />
        </label>
      </div>
      {message && <p style={{ color: "var(--status-danger)" }}>{message}</p>}
      <button className="btn-primary" type="submit">
        Create open game
      </button>
    </form>
  );
}

export function JoinGameButton({ gameId, label }: { gameId: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    try {
      await clientApiFetch(`/games/${gameId}/join`, { method: "POST", body: {} });
      logInfo("game.joined", { gameId });
      track("game_joined", { gameId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-primary" onClick={join} disabled={busy}>
      {busy ? "Joining…" : label || "Join game"}
    </button>
  );
}

/** P1-22 */
export function LeaveGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function leave() {
    if (!confirm("Leave this game?")) return;
    setBusy(true);
    logInfo("game.leave.submit", { gameId });
    try {
      await clientApiFetch(`/games/${gameId}/leave`, { method: "POST", body: {} });
      logInfo("game.left", { gameId });
      router.refresh();
    } catch (err) {
      logError("game.leave.fail", {
        gameId,
        message: err instanceof Error ? err.message : "unknown",
      });
      alert(err instanceof Error ? err.message : "Could not leave");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-secondary" onClick={leave} disabled={busy} type="button">
      {busy ? "Leaving…" : "Leave game"}
    </button>
  );
}

/** P1-25 */
export function PlayAgainButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function playAgain() {
    setBusy(true);
    logInfo("game.playAgain.submit", { gameId });
    try {
      const game = await clientApiFetch<Game>(`/games/${gameId}/play-again`, {
        method: "POST",
        body: {},
      });
      logInfo("game.playAgain.ok", { from: gameId, to: game._id });
      router.push(`/games/${game._id}`);
      router.refresh();
    } catch (err) {
      logError("game.playAgain.fail", {
        gameId,
        message: err instanceof Error ? err.message : "unknown",
      });
      alert(err instanceof Error ? err.message : "Play again failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-primary" onClick={playAgain} disabled={busy} type="button">
      {busy ? "Creating…" : "Play again"}
    </button>
  );
}
