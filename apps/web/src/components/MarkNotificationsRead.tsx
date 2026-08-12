"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function MarkNotificationsRead({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  if (unreadCount <= 0) return null;

  return (
    <button
      className="btn-secondary"
      disabled={busy}
      style={{ height: 36, padding: "0 14px" }}
      onClick={async () => {
        setBusy(true);
        try {
          await clientApiFetch("/notifications/read", {
            method: "POST",
            body: { all: true },
          });
          logInfo("notifications.markAllRead", { unreadCount });
          router.refresh();
        } finally {
          setBusy(false);
        }
      }}
    >
      Mark all read
    </button>
  );
}
