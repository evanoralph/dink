"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function BuyPackButton({ packId, label }: { packId: string; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function buy() {
    setBusy(true);
    try {
      await clientApiFetch(`/venue/packs/${packId}/buy`, { method: "POST", body: {} });
      logInfo("pack.buy.ok", { packId });
      router.refresh();
    } catch (err) {
      logError("pack.buy.fail", { packId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Purchase failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button className="btn-secondary" type="button" onClick={buy} disabled={busy}>
      {busy ? "…" : label}
    </button>
  );
}
