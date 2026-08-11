"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { Game, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export function CreateGameForm({ venues }: { venues: Venue[] }) {
  const router = useRouter();
  const [venueId, setVenueId] = useState(venues[0]?._id || "");
  const [message, setMessage] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    try {
      const game = await clientApiFetch<Game>("/games", {
        method: "POST",
        body: {
          venueId,
          startsAt,
          format: "doubles",
          skillMin: 3,
          skillMax: 4,
          capacity: 4,
          pricePerPlayer: 250,
          visibility: "public",
        },
      });
      logInfo("game.created", { gameId: game._id });
      router.push(`/games/${game._id}`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
      <strong>Create a game</strong>
      <select className="input" value={venueId} onChange={(e) => setVenueId(e.target.value)}>
        {venues.map((v) => (
          <option key={v._id} value={v._id}>{v.name}</option>
        ))}
      </select>
      {message && <p style={{ color: "var(--status-danger)" }}>{message}</p>}
      <button className="btn-primary" type="submit">Create open game</button>
    </form>
  );
}

export function JoinGameButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function join() {
    setBusy(true);
    try {
      await clientApiFetch(`/games/${gameId}/join`, { method: "POST", body: {} });
      logInfo("game.joined", { gameId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-primary" onClick={join} disabled={busy}>
      {busy ? "Joining…" : "Join game"}
    </button>
  );
}
