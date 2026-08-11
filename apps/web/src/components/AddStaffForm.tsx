"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function AddStaffForm({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [userEmail, setUserEmail] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await clientApiFetch("/venue/staff", {
        method: "POST",
        body: { venueId, userEmail },
      });
      logInfo("venue.staffAdd", { venueId, userEmail });
      setUserEmail("");
      router.refresh();
    } catch (error) {
      logError("venue.staffAdd.fail", {
        venueId,
        message: error instanceof Error ? error.message : "unknown",
      });
      alert(error instanceof Error ? error.message : "Failed to add staff");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16, display: "flex", gap: 10 }}>
      <input className="input" type="email" placeholder="staff@email.com" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
      <button className="btn-primary" type="submit">Add staff</button>
    </form>
  );
}
