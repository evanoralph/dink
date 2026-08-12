"use client";

import { useRouter } from "next/navigation";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

type Report = {
  _id: string;
  targetType: string;
  status: string;
};

export function ModerationResolve({ report }: { report: Report }) {
  const router = useRouter();
  if (report.status !== "open") return <span className="admin-muted">{report.status}</span>;

  async function resolve(status: "actioned" | "dismissed", action?: string) {
    logInfo("admin.moderation.resolve", { reportId: report._id, status, action });
    try {
      await clientApiFetch("/admin/moderation/resolve", {
        method: "POST",
        body: { reportId: report._id, status, action },
      });
      router.refresh();
    } catch (err) {
      logError("admin.moderation.resolve.fail", {
        message: err instanceof Error ? err.message : "unknown",
      });
      alert(err instanceof Error ? err.message : "Failed");
    }
  }

  return (
    <div className="admin-row-actions">
      {report.targetType === "review" && (
        <button
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          type="button"
          onClick={() => resolve("actioned", "hide_review")}
        >
          Hide review
        </button>
      )}
      {report.targetType === "user" && (
        <button
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          type="button"
          onClick={() => resolve("actioned", "suspend_user")}
        >
          Suspend user
        </button>
      )}
      {report.targetType === "venue" && (
        <button
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          type="button"
          onClick={() => resolve("actioned", "suspend_venue")}
        >
          Suspend venue
        </button>
      )}
      <button
        className="btn-secondary"
        style={{ height: 30, padding: "0 10px", fontSize: 11 }}
        type="button"
        onClick={() => resolve("dismissed")}
      >
        Dismiss
      </button>
    </div>
  );
}
