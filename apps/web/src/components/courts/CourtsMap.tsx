"use client";

import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo, useRef } from "react";
import type { Venue } from "@/lib/types";
import { logDebug, logWarn } from "@/lib/logger";

const DEFAULT_CENTER = { lat: 15.145, lng: 120.588 };
const MAP_STYLE = { width: "100%", height: "100%", minHeight: 360 };

type Props = {
  venues: Venue[];
};

function venueLatLng(venue: Venue) {
  const coords = venue.location?.coordinates;
  if (!coords || coords.length < 2) return null;
  return { lat: coords[1], lng: coords[0] };
}

function CourtsMapInner({ venues }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const mapRef = useRef<google.maps.Map | null>(null);

  const { isLoaded, loadError } = useJsApiLoader({
    id: "dink-google-maps",
    googleMapsApiKey: apiKey,
  });

  const markers = useMemo(
    () =>
      venues
        .map((v) => {
          const pos = venueLatLng(v);
          if (!pos) return null;
          return { venue: v, pos };
        })
        .filter(Boolean) as Array<{ venue: Venue; pos: { lat: number; lng: number } }>,
    [venues],
  );

  const center = useMemo(() => {
    const lat = Number(searchParams.get("lat"));
    const lng = Number(searchParams.get("lng"));
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    if (markers[0]) return markers[0].pos;
    return DEFAULT_CENTER;
  }, [markers, searchParams]);

  function searchThisArea() {
    const c = mapRef.current?.getCenter();
    const lat = c?.lat() ?? center.lat;
    const lng = c?.lng() ?? center.lng;
    const qs = new URLSearchParams(searchParams.toString());
    qs.set("lat", String(lat));
    qs.set("lng", String(lng));
    if (!qs.get("radiusKm")) qs.set("radiusKm", "10");
    qs.delete("city");
    logDebug("courts.map.searchThisArea", { lat, lng });
    router.push(`${pathname}?${qs}`);
  }

  if (loadError) {
    logWarn("courts.map.loadError", { message: String(loadError) });
    return (
      <div className="courts-map-fallback card">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Could not load Google Maps.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="courts-map-fallback card">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>Loading map…</p>
      </div>
    );
  }

  return (
    <div className="courts-map card">
      <GoogleMap
        mapContainerStyle={MAP_STYLE}
        center={center}
        zoom={12}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        onLoad={(map) => {
          mapRef.current = map;
          logDebug("courts.map.loaded", { markers: markers.length });
        }}
      >
        {markers.map(({ venue, pos }) => (
          <MarkerF
            key={venue._id}
            position={pos}
            title={venue.name}
            onClick={() => {
              logDebug("courts.map.markerClick", { venueId: venue._id });
              router.push(`/courts/${venue._id}`);
            }}
          />
        ))}
      </GoogleMap>
      <button
        type="button"
        className="btn-secondary courts-map-search-btn"
        onClick={searchThisArea}
      >
        Search this area
      </button>
    </div>
  );
}

export function CourtsMap({ venues }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const warnedMissingKey = useRef(false);

  if (!apiKey) {
    if (!warnedMissingKey.current) {
      warnedMissingKey.current = true;
      logWarn("courts.map.missingApiKey");
    }
    return (
      <div className="courts-map-fallback card">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          Map unavailable — set <code>NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to enable nearby map
          search. Listing filters still work.
        </p>
      </div>
    );
  }

  return <CourtsMapInner venues={venues} />;
}
