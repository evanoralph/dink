"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

const OPTIONS = [
  { value: "going", label: "Going" },
  { value: "maybe", label: "Maybe" },
  { value: "declined", label: "Can't" },
] as const;

export function GameRsvpBar({
  gameId,
  current,
}: {
  gameId: string;
  current?: "joined" | "maybe" | "declined" | "left" | string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const active = current === "joined" ? "going" : current;

  async function rsvp(status: "going" | "maybe" | "declined") {
    setBusy(status);
    logInfo("game.rsvp.submit", { gameId, status });
    try {
      await clientApiFetch(`/games/${gameId}/rsvp`, { method: "POST", body: { status } });
      logInfo("game.rsvp.ok", { gameId, status });
      router.refresh();
    } catch (err) {
      logError("game.rsvp.fail", { gameId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "RSVP failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          className={active === opt.value ? "btn-primary" : "btn-secondary"}
          disabled={Boolean(busy)}
          onClick={() => rsvp(opt.value)}
        >
          {busy === opt.value ? "…" : opt.label}
        </button>
      ))}
    </div>
  );
}
