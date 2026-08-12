"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { track } from "@/lib/analytics";
import { logError, logInfo } from "@/lib/logger";
import type { Venue } from "@/lib/types";

type Court = { _id: string; name: string };

export function VenueOnboardWizard() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [venue, setVenue] = useState<Venue | null>(null);
  const [courts, setCourts] = useState<Court[]>([]);
  const [name, setName] = useState("");
  const [city, setCity] = useState("Angeles City");
  const [address, setAddress] = useState("");
  const [indoor, setIndoor] = useState(true);
  const [courtName, setCourtName] = useState("Court 1");
  const [priceFrom, setPriceFrom] = useState(500);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function createVenue(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    logInfo("venue.onboard.create.submit", { name, city });
    try {
      const created = await clientApiFetch<Venue>("/venues", {
        method: "POST",
        body: { name, city, address, indoor, covered: true, airConditioned: indoor },
      });
      setVenue(created);
      track("venue_onboard_started", { venueId: created._id, city });
      logInfo("venue.onboard.create.ok", { venueId: created._id });
      setStep(2);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not create venue";
      setError(msg);
      logError("venue.onboard.create.fail", { message: msg });
    } finally {
      setBusy(false);
    }
  }

  async function addCourt(e: React.FormEvent) {
    e.preventDefault();
    if (!venue) return;
    setBusy(true);
    setError(null);
    try {
      const court = await clientApiFetch<Court>(`/venues/${venue._id}/courts`, {
        method: "POST",
        body: { name: courtName, surface: "acrylic" },
      });
      setCourts((prev) => [...prev, court]);
      setCourtName(`Court ${courts.length + 2}`);
      logInfo("venue.onboard.court", { venueId: venue._id, courtId: court._id });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add court");
    } finally {
      setBusy(false);
    }
  }

  async function applyHoursPricing(e: React.FormEvent) {
    e.preventDefault();
    if (!venue) return;
    if (!courts.length) {
      setError("Add at least one court");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await clientApiFetch("/venue/onboard-defaults", {
        method: "POST",
        body: { venueId: venue._id, priceFrom, startTime: "06:00", endTime: "22:00", slotDurationMin: 60 },
      });
      logInfo("venue.onboard.defaults", { venueId: venue._id, priceFrom });
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not apply hours/pricing");
    } finally {
      setBusy(false);
    }
  }

  function finish() {
    track("venue_onboard_submitted", { venueId: venue?._id, courts: courts.length });
    logInfo("venue.onboard.done", { venueId: venue?._id });
    router.push("/venue");
    router.refresh();
  }

  return (
    <div className="card" style={{ padding: 28, maxWidth: 560, width: "100%" }}>
      <div className="label">Step {step} of 4</div>
      <h1 className="display" style={{ margin: "12px 0 20px", fontSize: 36 }}>
        List your venue
      </h1>
      {error && <p style={{ color: "var(--status-danger)" }}>{error}</p>}

      {step === 1 && (
        <form onSubmit={createVenue} style={{ display: "grid", gap: 12 }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Venue name</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>City</span>
            <input className="input" value={city} onChange={(e) => setCity(e.target.value)} required />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Address</span>
            <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} />
            Indoor / air-conditioned
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Saving…" : "Continue"}
          </button>
        </form>
      )}

      {step === 2 && venue && (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Add courts for <strong>{venue.name}</strong>. You can edit more later under Venue → Courts.
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {courts.map((c) => (
              <li key={c._id}>{c.name}</li>
            ))}
            {courts.length === 0 && <li>No courts yet</li>}
          </ul>
          <form onSubmit={addCourt} style={{ display: "flex", gap: 10 }}>
            <input
              className="input"
              value={courtName}
              onChange={(e) => setCourtName(e.target.value)}
              required
            />
            <button className="btn-secondary" type="submit" disabled={busy}>
              Add
            </button>
          </form>
          <button className="btn-primary" type="button" disabled={!courts.length} onClick={() => setStep(3)}>
            Next: hours & pricing
          </button>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={applyHoursPricing} style={{ display: "grid", gap: 12 }}>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            Apply default hours (06:00–22:00, 60 min slots, all days) and hourly price to every court.
          </p>
          <label style={{ display: "grid", gap: 6 }}>
            <span style={{ fontWeight: 600 }}>Price from (₱ / hour)</span>
            <input
              className="input"
              type="number"
              min={0}
              value={priceFrom}
              onChange={(e) => setPriceFrom(Number(e.target.value))}
              required
            />
          </label>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? "Applying…" : "Apply defaults"}
          </button>
        </form>
      )}

      {step === 4 && (
        <div style={{ display: "grid", gap: 12 }}>
          <p style={{ margin: 0, lineHeight: 1.5 }}>
            Venue is <strong>pending admin approval</strong>. Players will see it after an admin
            marks it approved. You can keep editing courts, hours, and staff now.
          </p>
          <button className="btn-primary" type="button" onClick={finish}>
            Go to venue dashboard
          </button>
        </div>
      )}
    </div>
  );
}
