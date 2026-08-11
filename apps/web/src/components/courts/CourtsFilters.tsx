"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { logDebug, logInfo, logWarn } from "@/lib/logger";

const DEFAULT_RADIUS_KM = "10";

export function CourtsFilters({ defaultCity = "" }: { defaultCity?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [geoPending, setGeoPending] = useState(false);
  const [values, setValues] = useState({
    q: searchParams.get("q") || "",
    city: searchParams.get("city") || defaultCity || "",
    indoor: searchParams.get("indoor") || "",
    covered: searchParams.get("covered") || "",
  });

  function pushQuery(next: Record<string, string | null>) {
    const qs = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === "") qs.delete(key);
      else qs.set(key, value);
    }
    const url = qs.toString() ? `${pathname}?${qs}` : pathname;
    logDebug("courts.filter.apply", { query: qs.toString() });
    startTransition(() => router.push(url));
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    // City/amenity filter mode — clear nearby so results aren't over-constrained
    pushQuery({
      q: values.q.trim() || null,
      city: values.city.trim() || null,
      indoor: values.indoor || null,
      covered: values.covered || null,
      lat: null,
      lng: null,
      radiusKm: null,
    });
  }

  function nearMe() {
    if (!navigator.geolocation) {
      logWarn("courts.geo.unsupported");
      return;
    }
    setGeoPending(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoPending(false);
        logInfo("courts.geo.ok", {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        pushQuery({
          lat: String(pos.coords.latitude),
          lng: String(pos.coords.longitude),
          radiusKm: searchParams.get("radiusKm") || DEFAULT_RADIUS_KM,
          // Nearby search is geo-first; drop city so results aren't over-filtered
          city: null,
        });
      },
      (err) => {
        setGeoPending(false);
        logWarn("courts.geo.fail", { code: err.code, message: err.message });
      },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  function clearNearby() {
    pushQuery({ lat: null, lng: null, radiusKm: null });
  }

  const hasNearby = Boolean(searchParams.get("lat") && searchParams.get("lng"));

  return (
    <form className="courts-filters" onSubmit={onSubmit}>
      <label className="courts-filter-field">
        <span>Search</span>
        <input
          className="input"
          value={values.q}
          placeholder="Venue name"
          onChange={(e) => setValues((s) => ({ ...s, q: e.target.value }))}
        />
      </label>
      <label className="courts-filter-field">
        <span>City</span>
        <input
          className="input"
          value={values.city}
          placeholder="Angeles City"
          onChange={(e) => setValues((s) => ({ ...s, city: e.target.value }))}
        />
      </label>
      <label className="courts-filter-field">
        <span>Indoor</span>
        <select
          className="input"
          value={values.indoor}
          onChange={(e) => setValues((s) => ({ ...s, indoor: e.target.value }))}
        >
          <option value="">Any</option>
          <option value="true">Indoor</option>
          <option value="false">Outdoor</option>
        </select>
      </label>
      <label className="courts-filter-field">
        <span>Covered</span>
        <select
          className="input"
          value={values.covered}
          onChange={(e) => setValues((s) => ({ ...s, covered: e.target.value }))}
        >
          <option value="">Any</option>
          <option value="true">Covered</option>
          <option value="false">Open air</option>
        </select>
      </label>
      <div className="courts-filter-actions">
        <button type="submit" className="btn-primary" disabled={pending} style={{ height: 40, padding: "0 16px" }}>
          Filter
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={geoPending || pending}
          onClick={nearMe}
          style={{ height: 40, padding: "0 16px" }}
        >
          {geoPending ? "Locating…" : "Near me"}
        </button>
        {hasNearby && (
          <button
            type="button"
            className="btn-secondary"
            disabled={pending}
            onClick={clearNearby}
            style={{ height: 40, padding: "0 16px" }}
          >
            Clear map
          </button>
        )}
      </div>
    </form>
  );
}
