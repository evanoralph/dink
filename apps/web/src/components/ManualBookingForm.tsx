"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { Court } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export function ManualBookingForm({ venueId, courts }: { venueId: string; courts: Court[] }) {
  const router = useRouter();
  const [courtId, setCourtId] = useState(courts[0]?._id || "");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const startsAt = new Date();
    startsAt.setMinutes(0, 0, 0);
    startsAt.setHours(startsAt.getHours() + 1);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    await clientApiFetch("/bookings/manual", {
      method: "POST",
      body: {
        venueId,
        courtId,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
      },
    });
    logInfo("booking.manual", { venueId, courtId });
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 16, display: "flex", gap: 10, flexWrap: "wrap" }}>
      <select className="input" style={{ maxWidth: 260 }} value={courtId} onChange={(e) => setCourtId(e.target.value)}>
        {courts.map((c) => (
          <option key={c._id} value={c._id}>{c.name}</option>
        ))}
      </select>
      <button className="btn-primary" type="submit">Add walk-in (next hour)</button>
    </form>
  );
}
