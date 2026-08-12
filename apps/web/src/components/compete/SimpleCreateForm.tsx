"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function SimpleCreateForm({
  path,
  fields,
  extra,
  label,
  hrefFor,
}: {
  path: string;
  fields: Array<{ name: string; label: string; type?: string; defaultValue?: string }>;
  extra?: Record<string, unknown>;
  label: string;
  hrefFor: (id: string) => string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const body: Record<string, unknown> = { ...extra };
    for (const f of fields) {
      const v = String(fd.get(f.name) || "");
      if (f.type === "number") {
        body[f.name] = Number(v);
      } else if (f.type === "datetime-local" && v) {
        const d = new Date(v);
        body[f.name] = Number.isNaN(d.getTime()) ? v : d.toISOString();
      } else {
        body[f.name] = v;
      }
    }
    setBusy(true);
    setError(null);
    logInfo("compete.create.submit", { path, label });
    try {
      const created = await clientApiFetch<{ _id: string }>(path, { method: "POST", body });
      logInfo("compete.create.ok", { path, id: created._id });
      router.push(hrefFor(created._id));
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
      logError("compete.create.fail", { path, message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: "grid", gap: 10 }}>
      <strong>{label}</strong>
      {fields.map((f) => (
        <label key={f.name} style={{ display: "grid", gap: 4 }}>
          <span style={{ fontWeight: 600, fontSize: 14 }}>{f.label}</span>
          <input
            className="input"
            name={f.name}
            type={f.type || "text"}
            defaultValue={f.defaultValue}
            required
          />
        </label>
      ))}
      {error && <p style={{ color: "var(--status-danger)", margin: 0 }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Create"}
      </button>
    </form>
  );
}
