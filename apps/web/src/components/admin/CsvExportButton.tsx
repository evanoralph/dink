"use client";

import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo, logError } from "@/lib/logger";

export function CsvExportButton({ entity }: { entity: string }) {
  const searchParams = useSearchParams();
  const [busy, setBusy] = useState(false);

  async function onExport() {
    setBusy(true);
    try {
      const qs = new URLSearchParams(searchParams.toString());
      qs.set("entity", entity);
      const data = await clientApiFetch<{ csv: string; filename: string }>(
        `/admin/export?${qs.toString()}`,
      );
      const blob = new Blob([data.csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.filename;
      a.click();
      URL.revokeObjectURL(url);
      logInfo("admin.csv.export", { entity, filename: data.filename });
    } catch (error) {
      logError("admin.csv.export.fail", {
        entity,
        message: error instanceof Error ? error.message : "unknown",
      });
      alert(error instanceof Error ? error.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      className="btn-secondary"
      style={{ height: 36, padding: "0 14px" }}
      disabled={busy}
      onClick={onExport}
    >
      {busy ? "Exporting…" : "Export CSV"}
    </button>
  );
}
