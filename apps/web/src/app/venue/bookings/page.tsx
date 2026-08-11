import { Suspense } from "react";
import { ManualBookingForm } from "@/components/ManualBookingForm";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { VenueBookingStatusActions } from "@/components/venue/VenueActions";
import { apiFetch } from "@/lib/api";
import {
  BOOKING_STATUSES,
  buildQuery,
  formatDate,
  formatMoney,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { Booking, Court, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function VenueBookingsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const dash = await apiFetch<{ venues: Venue[] }>("/api/v1/venue/dashboard");
  const venue = dash.venues[0];
  let courts: Court[] = [];
  if (venue) {
    const detail = await apiFetch<{ courts: Court[] }>(`/api/v1/venues/${venue._id}`);
    courts = detail.courts;
  }
  const data = await apiFetch<AdminListResult<Booking>>(
    `/api/v1/venue/bookings${buildQuery(params)}`,
  );
  logInfo("page.venueBookings", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Bookings</h1>
          {venue ? <p className="admin-muted">{venue.name}</p> : null}
        </div>
      </div>

      <ModuleTip>
        Confirm walk-ins after cash payment, cancel no-shows, and mark completed sessions when play
        ends. Status changes apply only to your venue bookings.
      </ModuleTip>

      {venue ? <ManualBookingForm venueId={venue._id} courts={courts} /> : null}

      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Booking ID", type: "text" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: BOOKING_STATUSES.map((s) => ({ value: s, label: s })),
            },
            { name: "courtId", label: "Court ID", type: "text" },
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
          ]}
        />
      </Suspense>

      <DataTable
        rows={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        columns={[
          {
            key: "id",
            header: "ID",
            render: (b) => <span className="admin-mono">{b._id.slice(0, 10)}…</span>,
          },
          {
            key: "when",
            header: "Schedule",
            render: (b) => (
              <div>
                {formatDate(b.startsAt)}
                <div className="admin-muted">→ {formatDate(b.endsAt)}</div>
              </div>
            ),
          },
          {
            key: "court",
            header: "Court",
            render: (b) => <span className="admin-mono">{b.courtId.slice(0, 10)}…</span>,
          },
          {
            key: "total",
            header: "Total",
            render: (b) => formatMoney(b.total, b.currency),
          },
          {
            key: "status",
            header: "Status",
            render: (b) => <StatusBadge status={b.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (b) => <VenueBookingStatusActions bookingId={b._id} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
