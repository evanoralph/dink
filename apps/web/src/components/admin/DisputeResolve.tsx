"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function DisputeResolve({ disputeId }: { disputeId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function run(action: "dismiss" | "void_ratings") {
    setBusy(action);
    try {
      await clientApiFetch("/admin/disputes/resolve", {
        method: "POST",
        body: { disputeId, action },
      });
      logInfo("admin.dispute.resolve.ok", { disputeId, action });
      router.refresh();
    } catch (err) {
      logError("admin.dispute.resolve.fail", {
        disputeId,
        action,
        message: err instanceof Error ? err.message : "unknown",
      });
      alert(err instanceof Error ? err.message : "Resolve failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={{ display: "flex", gap: 6 }}>
      <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => run("dismiss")}>
        Dismiss
      </button>
      <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => run("void_ratings")}>
        Void ratings
      </button>
    </div>
  );
}
