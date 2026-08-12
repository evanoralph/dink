import { ModuleTip } from "@/components/venue/ModuleTip";
import { VenueHoursForms } from "@/components/venue/VenueHoursForms";
import { apiFetch } from "@/lib/api";
import type { Court, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type AvailabilityRule = {
  _id: string;
  courtId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMin: number;
};
type PricingRule = {
  _id: string;
  courtId?: string;
  days: number[];
  startTime: string;
  endTime: string;
  price: number;
  pricingType: string;
};
type Blackout = {
  _id: string;
  courtId: string;
  startsAt: string;
  endsAt: string;
  reason?: string;
};

export default async function VenueHoursPage() {
  const dash = await apiFetch<{ venues: Venue[] }>("/api/v1/venue/dashboard");
  const venue = dash.venues[0];

  if (!venue) {
    return (
      <>
        <div className="admin-page-header">
          <div>
            <div className="label">Venue</div>
            <h1>Hours & pricing</h1>
          </div>
        </div>
        <p className="card" style={{ padding: 18 }}>
          No venue assigned to this account yet.
        </p>
      </>
    );
  }

  const courtsResult = await apiFetch<{ items: Court[] }>(
    `/api/v1/venue/courts?venueId=${venue._id}&pageSize=100`,
  );
  const courts = courtsResult.items || [];

  const [availability, pricing, blackouts] = await Promise.all([
    apiFetch<AvailabilityRule[]>(`/api/v1/venue/availability-rules?venueId=${venue._id}`),
    apiFetch<PricingRule[]>(`/api/v1/venue/pricing-rules?venueId=${venue._id}`),
    apiFetch<Blackout[]>(`/api/v1/venue/blackouts?venueId=${venue._id}`),
  ]);

  logInfo("page.venueHours", {
    venueId: venue._id,
    courts: courts.length,
    availability: availability.length,
    pricing: pricing.length,
    blackouts: blackouts.length,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Hours & pricing</h1>
          <p className="admin-muted">{venue.name}</p>
        </div>
      </div>

      <ModuleTip>
        Changes here update public court availability and prices on `/courts/[id]`. Blocked times are
        hidden from players entirely.
      </ModuleTip>

      <VenueHoursForms
        venueId={venue._id}
        courts={courts}
        availability={availability}
        pricing={pricing}
        blackouts={blackouts}
      />
    </>
  );
}
