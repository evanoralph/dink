"use client";

import { GoogleMap, MarkerF, useJsApiLoader } from "@react-google-maps/api";
import { useRef } from "react";
import type { GeoPoint } from "@/lib/types";
import { logDebug, logWarn } from "@/lib/logger";

function DetailMapInner({ location, name }: { location: GeoPoint; name: string }) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const { isLoaded, loadError } = useJsApiLoader({
    id: "dink-google-maps",
    googleMapsApiKey: apiKey,
  });
  const center = { lat: location.coordinates[1], lng: location.coordinates[0] };

  if (loadError || !isLoaded) {
    return (
      <div className="courts-map-fallback card court-detail-map">
        <p style={{ margin: 0, color: "var(--text-muted)" }}>
          {loadError ? "Map unavailable" : "Loading map…"}
        </p>
      </div>
    );
  }

  return (
    <div className="courts-map card court-detail-map">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={14}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
        }}
        onLoad={() => logDebug("courts.detailMap.loaded", { name })}
      >
        <MarkerF position={center} title={name} />
      </GoogleMap>
    </div>
  );
}

export function VenueDetailMap({
  location,
  name,
}: {
  location?: GeoPoint;
  name: string;
}) {
  const warned = useRef(false);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  if (!location?.coordinates) return null;
  if (!apiKey) {
    if (!warned.current) {
      warned.current = true;
      logWarn("courts.detailMap.missingApiKey");
    }
    return null;
  }

  return <DetailMapInner location={location} name={name} />;
}
