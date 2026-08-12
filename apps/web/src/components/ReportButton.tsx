"use client";

import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function ReportButton({
  targetType,
  targetId,
  label = "Report",
}: {
  targetType: "user" | "venue" | "review";
  targetId: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("inappropriate");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    logInfo("report.submit", { targetType, targetId, reason });
    try {
      await clientApiFetch("/reports", {
        method: "POST",
        body: { targetType, targetId, reason, details: details.trim() || undefined },
      });
      logInfo("report.ok", { targetType, targetId });
      setOpen(false);
      setDetails("");
      alert("Report sent. Thanks — admin will review.");
    } catch (err) {
      logError("report.fail", { message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Could not send report");
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <button className="btn-secondary" type="button" onClick={() => setOpen(true)}>
        {label}
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="card" style={{ padding: 16, display: "grid", gap: 8, maxWidth: 360 }}>
      <strong>{label}</strong>
      <select className="input" value={reason} onChange={(e) => setReason(e.target.value)}>
        <option value="inappropriate">Inappropriate</option>
        <option value="harassment">Harassment</option>
        <option value="spam">Spam</option>
        <option value="no_show_abuse">No-show / abuse</option>
        <option value="other">Other</option>
      </select>
      <textarea
        className="input"
        style={{ height: 80, paddingTop: 10 }}
        placeholder="Optional details"
        value={details}
        onChange={(e) => setDetails(e.target.value)}
      />
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-primary" type="submit" disabled={busy}>
          {busy ? "Sending…" : "Submit"}
        </button>
        <button className="btn-secondary" type="button" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </form>
  );
}
