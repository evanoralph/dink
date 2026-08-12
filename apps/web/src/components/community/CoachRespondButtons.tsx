"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function CoachRespondButtons({ requestId, status }: { requestId: string; status: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  async function respond(next: "accepted" | "declined" | "completed") {
    setBusy(next);
    try {
      await clientApiFetch(`/coaches/requests/${requestId}/respond`, {
        method: "POST",
        body: { status: next },
      });
      logInfo("coach.respond.ok", { requestId, status: next });
      router.refresh();
    } finally {
      setBusy(null);
    }
  }

  if (!["pending", "accepted"].includes(status)) return null;

  return (
    <div className="card" style={{ padding: 20, marginTop: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
      {status === "pending" && (
        <>
          <button className="btn-primary" type="button" disabled={Boolean(busy)} onClick={() => respond("accepted")}>
            {busy === "accepted" ? "…" : "Accept request"}
          </button>
          <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => respond("declined")}>
            Decline
          </button>
        </>
      )}
      {status === "accepted" && (
        <button className="btn-secondary" type="button" disabled={Boolean(busy)} onClick={() => respond("completed")}>
          Mark completed
        </button>
      )}
    </div>
  );
}
