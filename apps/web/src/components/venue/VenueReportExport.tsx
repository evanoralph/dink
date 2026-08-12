"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function VenueReportExport() {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function exportCsv() {
    setBusy(true);
    try {
      const qs = new URLSearchParams(searchParams.toString());
      const data = await clientApiFetch<{ csv: string; filename: string }>(
        `/venue/reports/export?${qs.toString()}`,
      );
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      logInfo("venue.report.export", { filename: data.filename });
    } catch (err) {
      logError("venue.report.export.fail", { message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", gap: 8 }}>
      <button className="btn-secondary" type="button" style={{ height: 36, padding: "0 14px" }} disabled={busy} onClick={exportCsv}>
        {busy ? "Exporting…" : "Export CSV"}
      </button>
      <button
        className="btn-secondary"
        type="button"
        style={{ height: 36, padding: "0 14px" }}
        onClick={() => window.print()}
      >
        Print / PDF
      </button>
    </div>
  );
}
