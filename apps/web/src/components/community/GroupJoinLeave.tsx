"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function GroupJoinLeave({
  groupId,
  joined,
  isOwner,
}: {
  groupId: string;
  joined: boolean;
  isOwner: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function run() {
    if (isOwner && joined) return;
    setBusy(true);
    const path = joined ? `/groups/${groupId}/leave` : `/groups/${groupId}/join`;
    try {
      await clientApiFetch(path, { method: "POST", body: {} });
      logInfo(joined ? "group.left" : "group.joined", { groupId });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  if (isOwner) {
    return <p style={{ color: "var(--text-muted)", margin: 0 }}>You own this group</p>;
  }

  return (
    <button className={joined ? "btn-secondary" : "btn-primary"} type="button" onClick={run} disabled={busy}>
      {busy ? "…" : joined ? "Leave group" : "Join group"}
    </button>
  );
}
