"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function AcceptFriendButton({ userId }: { userId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function accept() {
    setBusy(true);
    try {
      await clientApiFetch("/friends/accept", { method: "POST", body: { userId } });
      logInfo("friend.accept.ok", { userId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-primary" type="button" onClick={accept} disabled={busy} style={{ height: 32, padding: "0 12px" }}>
      {busy ? "…" : "Accept"}
    </button>
  );
}
