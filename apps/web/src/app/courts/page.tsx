import Link from "next/link";
import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { CourtsFilters } from "@/components/courts/CourtsFilters";
import { CourtsMap } from "@/components/courts/CourtsMap";
import { VenueRating } from "@/components/courts/VenueRating";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function first(v: string | string[] | undefined) {
  return Array.isArray(v) ? v[0] : v;
}

function truncate(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function amenityLabel(venue: Venue) {
  const parts = [
    venue.indoor ? "Indoor" : venue.covered ? "Covered" : "Outdoor",
    venue.airConditioned ? "AC" : null,
    `${venue.courtCount} courts`,
  ].filter(Boolean);
  return parts.join(" · ");
}

export default async function CourtsPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const user = await getCurrentUser();

  const lat = first(sp.lat);
  const lng = first(sp.lng);
  const hasNearby = Boolean(lat && lng);
  const city =
    first(sp.city) ||
    (hasNearby ? undefined : user?.profile.city || "Angeles City");
  const indoor = first(sp.indoor);
  const covered = first(sp.covered);
  const q = first(sp.q);
  const radiusKm = first(sp.radiusKm) || (hasNearby ? "10" : undefined);

  const qs = new URLSearchParams();
  if (city) qs.set("city", city);
  if (indoor === "true" || indoor === "false") qs.set("indoor", indoor);
  if (covered === "true" || covered === "false") qs.set("covered", covered);
  if (q) qs.set("q", q);
  if (hasNearby) {
    qs.set("lat", lat!);
    qs.set("lng", lng!);
    if (radiusKm) qs.set("radiusKm", radiusKm);
  }

  let venues: Venue[] = [];
  let error: string | null = null;
  try {
    venues = await apiFetch<Venue[]>(`/api/v1/venues?${qs.toString()}`);
    logInfo("page.courts", {
      count: venues.length,
      city,
      nearby: hasNearby,
      q,
      indoor,
      covered,
    });
  } catch (err) {
    error = err instanceof Error ? err.message : "Failed to load venues";
  }

  const heading = hasNearby
    ? "Courts near you"
    : city
      ? `Courts near ${city}`
      : "Courts";

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Book</div>
        <h1 className="display" style={{ margin: "12px 0 20px" }}>
          {heading}
        </h1>

        <Suspense fallback={<div className="card" style={{ padding: 16 }}>Loading filters…</div>}>
          <CourtsFilters defaultCity={hasNearby ? "" : city || ""} />
        </Suspense>

        {error && (
          <p className="card" style={{ padding: 20, color: "var(--status-danger)", marginTop: 16 }}>
            {error}. Is the Meteor API running on :3001?
          </p>
        )}

        <div className="courts-layout">
          <Suspense
            fallback={
              <div className="courts-map-fallback card">
                <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading map…</p>
              </div>
            }
          >
            <CourtsMap venues={venues} />
          </Suspense>

          <div className="courts-grid">
            {venues.length === 0 && !error ? (
              <p className="card" style={{ padding: 20, color: "var(--text-muted)" }}>
                No venues match these filters.
              </p>
            ) : (
              venues.map((venue) => {
                const cover = venue.imageUrls?.[0];
                return (
                  <Link key={venue._id} href={`/courts/${venue._id}`} className="card courts-card">
                    <div
                      className="courts-card-media"
                      style={
                        cover
                          ? { backgroundImage: `url(${cover})` }
                          : undefined
                      }
                    />
                    <div className="courts-card-body">
                      <div className="courts-card-title">{venue.name}</div>
                      {venue.description && (
                        <p className="courts-card-desc">{truncate(venue.description, 100)}</p>
                      )}
                      <div style={{ color: "var(--text-muted)", marginTop: 8 }}>
                        {amenityLabel(venue)}
                        {typeof venue.distanceKm === "number" ? ` · ${venue.distanceKm} km` : ""}
                      </div>
                      <div className="courts-card-meta">
                        <VenueRating avg={venue.ratingAvg} count={venue.ratingCount} compact />
                        <div style={{ font: "700 16px/1 var(--font-mono)" }}>
                          ₱{venue.priceFrom ?? "—"}/hr
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>
      </main>
    </>
  );
}
