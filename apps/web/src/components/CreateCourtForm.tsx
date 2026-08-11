"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function CreateCourtForm({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [name, setName] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    await clientApiFetch(`/venues/${venueId}/courts`, {
      method: "POST",
      body: { name, surface: "acrylic" },
    });
    logInfo("court.created", { venueId, name });
    setName("");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16, display: "flex", gap: 10 }}>
      <input className="input" placeholder="Court name" value={name} onChange={(e) => setName(e.target.value)} required />
      <button className="btn-primary" type="submit">Add court</button>
    </form>
  );
}
