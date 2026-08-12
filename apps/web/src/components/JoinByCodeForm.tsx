"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, clientApiFetch } from "@/lib/api-client";
import type { Game } from "@/lib/types";
import { logError, logInfo } from "@/lib/logger";

/** P1-23: join via invite code (client). */
export function JoinByCodeForm() {
  const router = useRouter();
  const params = useSearchParams();
  const codeFromUrl = params.get("code") || "";
  const [code, setCode] = useState(codeFromUrl);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoTried, setAutoTried] = useState(false);

  async function join(nextCode: string) {
    setLoading(true);
    setError(null);
    logInfo("game.joinByCode.submit", { hasCode: Boolean(nextCode) });
    try {
      const game = await clientApiFetch<Game>("/games/join-by-code", {
        method: "POST",
        body: { code: nextCode },
      });
      logInfo("game.joinByCode.ok", { gameId: game._id });
      router.push(`/games/${game._id}`);
      router.refresh();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        const next = `/games/join?code=${encodeURIComponent(nextCode)}`;
        logInfo("game.joinByCode.need_login", { next });
        router.push(`/login?next=${encodeURIComponent(next)}`);
        return;
      }
      const msg = err instanceof Error ? err.message : "Join failed";
      setError(msg);
      logError("game.joinByCode.fail", { message: msg });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (codeFromUrl && !autoTried) {
      setAutoTried(true);
      void join(codeFromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot deep link
  }, [codeFromUrl, autoTried]);

  return (
    <form
      className="card"
      style={{ padding: 28, maxWidth: 440, width: "100%", display: "grid", gap: 12 }}
      onSubmit={(e) => {
        e.preventDefault();
        void join(code);
      }}
    >
      <div className="label">Invite</div>
      <h1 className="display" style={{ margin: 0, fontSize: 36 }}>
        Join by code
      </h1>
      <label style={{ display: "grid", gap: 8 }}>
        <span style={{ fontWeight: 600 }}>Invite code</span>
        <input
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          autoCapitalize="off"
        />
      </label>
      {error && <p style={{ color: "var(--status-danger)" }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading}>
        {loading ? "Joining…" : "Join game"}
      </button>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
        Need an account?{" "}
        <Link href="/login" style={{ color: "var(--court-500)", fontWeight: 700 }}>
          Log in
        </Link>
      </p>
    </form>
  );
}
