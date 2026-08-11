"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, clientApiFetch } from "@/lib/api-client";
import type { Venue } from "@/lib/types";
import { logInfo, logWarn } from "@/lib/logger";

function latFromVenue(venue: Venue) {
  return venue.location?.coordinates?.[1];
}

function lngFromVenue(venue: Venue) {
  return venue.location?.coordinates?.[0];
}

export function VenueSettingsForm({ venue }: { venue: Venue }) {
  const router = useRouter();
  const [description, setDescription] = useState(venue.description || "");
  const [imageUrlsText, setImageUrlsText] = useState((venue.imageUrls || []).join("\n"));
  const [lat, setLat] = useState(
    latFromVenue(venue) != null ? String(latFromVenue(venue)) : "",
  );
  const [lng, setLng] = useState(
    lngFromVenue(venue) != null ? String(lngFromVenue(venue)) : "",
  );
  const [indoor, setIndoor] = useState(Boolean(venue.indoor));
  const [covered, setCovered] = useState(Boolean(venue.covered));
  const [airConditioned, setAirConditioned] = useState(Boolean(venue.airConditioned));
  const [address, setAddress] = useState(venue.address || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setOk(false);

    const imageUrls = imageUrlsText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);

    const body: Record<string, unknown> = {
      description,
      address,
      indoor,
      covered,
      airConditioned,
      imageUrls,
    };

    const latNum = lat.trim() === "" ? null : Number(lat);
    const lngNum = lng.trim() === "" ? null : Number(lng);
    if (latNum === null && lngNum === null) {
      body.location = null;
    } else if (
      typeof latNum === "number" &&
      typeof lngNum === "number" &&
      Number.isFinite(latNum) &&
      Number.isFinite(lngNum)
    ) {
      body.lat = latNum;
      body.lng = lngNum;
    } else {
      setPending(false);
      setError("Enter both latitude and longitude, or leave both blank.");
      return;
    }

    try {
      await clientApiFetch(`/api/v1/venues/${venue._id}`, {
        method: "PATCH",
        body,
      });
      logInfo("venue.settings.saved", { venueId: venue._id, imageCount: imageUrls.length });
      setOk(true);
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Save failed";
      logWarn("venue.settings.fail", { venueId: venue._id, message });
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="admin-panel" onSubmit={onSubmit} style={{ display: "grid", gap: 12 }}>
      <h2 style={{ margin: 0 }}>{venue.name}</h2>
      <p className="admin-muted" style={{ margin: 0 }}>
        {venue.city} · {venue.status}
      </p>

      <label className="admin-filter-field">
        <span>Address</span>
        <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </label>

      <label className="admin-filter-field">
        <span>Description</span>
        <textarea
          className="input"
          style={{ height: 110, padding: 12, resize: "vertical" }}
          value={description}
          maxLength={2000}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>

      <label className="admin-filter-field">
        <span>Image URLs (one per line)</span>
        <textarea
          className="input"
          style={{ height: 110, padding: 12, resize: "vertical", fontFamily: "var(--font-mono)" }}
          value={imageUrlsText}
          placeholder="https://…"
          onChange={(e) => setImageUrlsText(e.target.value)}
        />
      </label>

      <div className="admin-grid-2">
        <label className="admin-filter-field">
          <span>Latitude</span>
          <input
            className="input"
            value={lat}
            placeholder="15.145"
            onChange={(e) => setLat(e.target.value)}
          />
        </label>
        <label className="admin-filter-field">
          <span>Longitude</span>
          <input
            className="input"
            value={lng}
            placeholder="120.595"
            onChange={(e) => setLng(e.target.value)}
          />
        </label>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: 16 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={indoor} onChange={(e) => setIndoor(e.target.checked)} />
          Indoor
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={covered} onChange={(e) => setCovered(e.target.checked)} />
          Covered
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input
            type="checkbox"
            checked={airConditioned}
            onChange={(e) => setAirConditioned(e.target.checked)}
          />
          Air-conditioned
        </label>
      </div>

      {error && <p style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>}
      {ok && <p style={{ margin: 0, color: "#15803d" }}>Saved. Listing will show updated media and map pin.</p>}

      <button type="submit" className="btn-primary" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Saving…" : "Save venue"}
      </button>
    </form>
  );
}
