import { CreatePackForm } from "@/components/venue/CreatePackForm";
import { apiFetch } from "@/lib/api";
import { logInfo } from "@/lib/logger";

type Venue = { _id: string; name: string };
type Pack = { _id: string; venueId: string; name: string; price: number; discountPct: number; durationDays: number; visitsIncluded?: number };

export default async function VenuePacksPage() {
  const dash = await apiFetch<{ venues: Venue[] }>("/api/v1/venue/dashboard?days=7");
  const venue = dash.venues[0];
  const packs = venue
    ? await apiFetch<Pack[]>(`/api/v1/venue/packs?venueId=${encodeURIComponent(venue._id)}`)
    : [];
  logInfo("page.venuePacks", { venueId: venue?._id, packs: packs.length });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Membership packs</h1>
        </div>
      </div>
      <p className="admin-muted">
        Players with an active pass get a % discount at booking. Stub checkout confirms instantly.
      </p>
      {!venue && <p>Create a venue first.</p>}
      {venue && (
        <>
          <div className="admin-panel" style={{ marginTop: 16 }}>
            <h2>{venue.name}</h2>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Pack</th>
                  <th>Price</th>
                  <th>Discount</th>
                  <th>Days</th>
                  <th>Visits</th>
                </tr>
              </thead>
              <tbody>
                {packs.map((p) => (
                  <tr key={p._id}>
                    <td>{p.name}</td>
                    <td>₱{p.price}</td>
                    <td>{p.discountPct}%</td>
                    <td>{p.durationDays}</td>
                    <td>{p.visitsIncluded ?? "∞"}</td>
                  </tr>
                ))}
                {packs.length === 0 && (
                  <tr>
                    <td colSpan={5}>No packs yet</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <CreatePackForm venueId={venue._id} />
        </>
      )}
    </>
  );
}
