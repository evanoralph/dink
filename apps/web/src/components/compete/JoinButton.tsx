"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function JoinButton({ path, label = "Join" }: { path: string; label?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      await clientApiFetch(path, { method: "POST", body: {} });
      logInfo("compete.join.ok", { path });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <button className="btn-primary" type="button" onClick={run} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}
