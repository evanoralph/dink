"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function AccountPrivacyActions() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  async function downloadExport() {
    logInfo("me.export.submit");
    try {
      const data = await clientApiFetch<unknown>("/me/export");
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dink-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      logInfo("me.export.ok");
    } catch (err) {
      logError("me.export.fail", { message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Export failed");
    }
  }

  async function deleteAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Permanently close this account? Future bookings will be cancelled.")) return;
    setBusy(true);
    logInfo("me.delete.submit");
    try {
      await clientApiFetch("/me/delete", { method: "POST", body: { password } });
      logInfo("me.delete.ok");
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/");
      router.refresh();
    } catch (err) {
      logError("me.delete.fail", { message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ padding: 20, maxWidth: 520, marginTop: 20, display: "grid", gap: 12 }}>
      <strong>Privacy</strong>
      <button className="btn-secondary" type="button" onClick={downloadExport}>
        Download my data
      </button>
      <form onSubmit={deleteAccount} style={{ display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 6 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>Confirm password to delete</span>
          <input
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={1}
          />
        </label>
        <button className="btn-secondary" type="submit" disabled={busy}>
          {busy ? "Deleting…" : "Delete account"}
        </button>
      </form>
    </div>
  );
}
