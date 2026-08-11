"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logInfo } from "@/lib/logger";

export function OnboardingForm() {
  const router = useRouter();
  const [city, setCity] = useState("Angeles City");
  const [skillLevel, setSkillLevel] = useState(3);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await clientApiFetch("/me/profile", {
        method: "PATCH",
        body: { city, skillLevel, onboardingComplete: true },
      });
      logInfo("onboarding.complete", { city, skillLevel });
      router.push("/play");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 28, maxWidth: 480, width: "100%" }}>
      <div className="label">Onboarding</div>
      <h1 className="display" style={{ margin: "12px 0 24px", fontSize: 40 }}>Where do you play?</h1>
      <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 600 }}>City</span>
        <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
      </label>
      <label style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <span style={{ fontWeight: 600 }}>Skill level (2.0–5.0)</span>
        <input
          className="input"
          type="number"
          step="0.5"
          min={2}
          max={5.5}
          value={skillLevel}
          onChange={(e) => setSkillLevel(Number(e.target.value))}
          required
        />
      </label>
      {error && <p style={{ color: "var(--status-danger)" }}>{error}</p>}
      <button className="btn-primary" type="submit" style={{ width: "100%", justifyContent: "center" }}>
        Start playing
      </button>
    </form>
  );
}
