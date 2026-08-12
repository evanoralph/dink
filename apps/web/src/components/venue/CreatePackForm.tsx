"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function CreatePackForm({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    setBusy(true);
    try {
      await clientApiFetch("/venue/packs", {
        method: "POST",
        body: {
          venueId,
          name: String(fd.get("name")),
          price: Number(fd.get("price")),
          discountPct: Number(fd.get("discountPct")),
          durationDays: Number(fd.get("durationDays")),
          visitsIncluded: fd.get("visitsIncluded") ? Number(fd.get("visitsIncluded")) : undefined,
        },
      });
      logInfo("venue.pack.create.ok", { venueId });
      router.refresh();
    } catch (err) {
      logError("venue.pack.create.fail", { venueId, message: err instanceof Error ? err.message : "unknown" });
      alert(err instanceof Error ? err.message : "Create failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="admin-panel" style={{ marginTop: 16, display: "grid", gap: 10, maxWidth: 480 }}>
      <h2>New pack</h2>
      <input className="input" name="name" placeholder="Name" required />
      <input className="input" name="price" type="number" min={0} defaultValue={1500} required />
      <input className="input" name="discountPct" type="number" min={0} max={90} defaultValue={20} required />
      <input className="input" name="durationDays" type="number" min={1} defaultValue={30} required />
      <input className="input" name="visitsIncluded" type="number" min={1} placeholder="Visits (optional)" />
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Create pack"}
      </button>
    </form>
  );
}
