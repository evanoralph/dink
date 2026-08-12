"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { Game } from "@/lib/types";
import { logError, logInfo } from "@/lib/logger";

export function RepeatWeeklyButton({ gameId }: { gameId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    setBusy(true);
    logInfo("game.repeatWeekly.submit", { gameId });
    try {
      const game = await clientApiFetch<Game>(`/games/${gameId}/repeat-weekly`, {
        method: "POST",
        body: {},
      });
      logInfo("game.repeatWeekly.ok", { from: gameId, to: game._id });
      router.push(`/games/${game._id}`);
      router.refresh();
    } catch (err) {
      logError("game.repeatWeekly.fail", { gameId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Could not repeat");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-secondary" type="button" onClick={run} disabled={busy}>
      {busy ? "Creating…" : "Repeat next week"}
    </button>
  );
}
