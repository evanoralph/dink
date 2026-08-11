"use client";

import { useRouter } from "next/navigation";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function FlagToggle({ flagKey, enabled }: { flagKey: string; enabled: boolean }) {
  const router = useRouter();
  return (
    <button
      className={enabled ? "btn-primary" : "btn-secondary"}
      style={{ height: 34, padding: "0 12px" }}
      onClick={async () => {
        await clientApiFetch("/admin/feature-flags", {
          method: "POST",
          body: { key: flagKey, enabled: !enabled },
        });
        logInfo("admin.flagToggle", { key: flagKey, enabled: !enabled });
        router.refresh();
      }}
    >
      {enabled ? "On" : "Off"}
    </button>
  );
}
