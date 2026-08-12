"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { Group } from "@/lib/types";
import { logError, logInfo } from "@/lib/logger";

export function CreateGroupForm({ defaultCity }: { defaultCity: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [city, setCity] = useState(defaultCity);
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    logInfo("group.create.submit", { name, city });
    try {
      const group = await clientApiFetch<Group>("/groups", {
        method: "POST",
        body: { name, city, description: description || undefined },
      });
      logInfo("group.create.ok", { groupId: group._id });
      router.push(`/groups/${group._id}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
      logError("group.create.fail", { message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
      <strong>Start a group</strong>
      <input className="input" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} required />
      <input className="input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} required />
      <textarea className="input" placeholder="Description (optional)" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
      {error && <p style={{ color: "var(--status-danger)", margin: 0 }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Creating…" : "Create group"}
      </button>
    </form>
  );
}
