import { ModuleTip } from "@/components/venue/ModuleTip";
import { VenueSettingsForm } from "@/components/venue/VenueSettingsForm";
import { apiFetch } from "@/lib/api";
import type { Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type DashboardStats = {
  venues: Venue[];
};

export default async function VenueSettingsPage() {
  const data = await apiFetch<DashboardStats>("/api/v1/venue/dashboard?days=7");
  logInfo("page.venueSettings", { venues: data.venues.length });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Listing settings</h1>
          <p className="admin-muted">
            Update descriptions, photo URLs, and map coordinates shown on the public courts listing.
          </p>
        </div>
      </div>

      <ModuleTip>
        Paste public image URLs (one per line). Set latitude/longitude so players can find you with
        Near me and map search. Leave both blank to clear the map pin.
      </ModuleTip>

      {data.venues.length === 0 ? (
        <div className="admin-panel">
          <p className="admin-muted">No venues linked to this account.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: 16 }}>
          {data.venues.map((venue) => (
            <VenueSettingsForm key={venue._id} venue={venue} />
          ))}
        </div>
      )}
    </>
  );
}
