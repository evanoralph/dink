import { Suspense } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { apiFetch } from "@/lib/api";
import { buildQuery, formatDate, formatMoney, type AdminSearchParams } from "@/lib/admin";
import type { Booking } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function VenueCalendarPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const bookings = await apiFetch<Booking[]>(
    `/api/v1/venue/calendar${buildQuery(params)}`,
  );
  logInfo("page.venueCalendar", { count: bookings.length });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Calendar</h1>
          <p className="admin-muted">Upcoming and active bookings by start time</p>
        </div>
      </div>

      <ModuleTip>
        Filter by date range to plan staffing and court prep. Confirmed and completed slots are
        shown; use Bookings to change status.
      </ModuleTip>

      <Suspense>
        <FilterBar
          fields={[
            { name: "venueId", label: "Venue ID", type: "text" },
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
          ]}
        />
      </Suspense>

      <DataTable
        rows={bookings}
        columns={[
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
        ]}
        empty="No bookings in range."
      />
    </>
  );
}
