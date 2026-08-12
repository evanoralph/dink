"use client";

import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function FriendButton({ userId, label = "Add friend" }: { userId: string; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function request() {
    setBusy(true);
    try {
      await clientApiFetch("/friends/request", { method: "POST", body: { userId } });
      logInfo("friend.request.ok", { userId });
      setDone(true);
    } catch {
      setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-secondary" type="button" onClick={request} disabled={busy || done}>
      {done ? "Requested" : busy ? "…" : label}
    </button>
  );
}
