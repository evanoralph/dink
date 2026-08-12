"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import type { CoachProfile } from "@/lib/types";
import { logError, logInfo } from "@/lib/logger";

export function BecomeCoachForm({ defaultCity }: { defaultCity: string }) {
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [bio, setBio] = useState("");
  const [hourlyRate, setHourlyRate] = useState(800);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    logInfo("coach.profile.submit", { city, hourlyRate });
    try {
      const profile = await clientApiFetch<CoachProfile>("/coaches/profile", {
        method: "POST",
        body: { city, bio: bio || undefined, hourlyRate },
      });
      logInfo("coach.profile.ok", { userId: profile.userId });
      router.push(`/coaches/${profile.userId}`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setError(msg);
      logError("coach.profile.fail", { message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, display: "grid", gap: 12 }}>
      <strong>List yourself as a coach</strong>
      <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required placeholder="City" />
      <input
        className="input"
        type="number"
        min={0}
        value={hourlyRate}
        onChange={(e) => setHourlyRate(Number(e.target.value))}
        required
      />
      <textarea className="input" rows={3} placeholder="Bio" value={bio} onChange={(e) => setBio(e.target.value)} />
      {error && <p style={{ color: "var(--status-danger)", margin: 0 }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Save coach profile"}
      </button>
    </form>
  );
}
