import { Suspense } from "react";
import { BookingStatusActions } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  BOOKING_STATUSES,
  buildQuery,
  formatDate,
  formatMoney,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { Booking } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<Booking>>(
    `/api/v1/admin/bookings${buildQuery(params)}`,
  );
  logInfo("page.adminBookings", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Bookings</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="bookings" />
        </Suspense>
      </div>
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
            { name: "venueId", label: "Venue ID", type: "text" },
            { name: "courtId", label: "Court ID", type: "text" },
            { name: "userId", label: "User ID", type: "text" },
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
            key: "venue",
            header: "Venue / Court",
            render: (b) => (
              <div className="admin-mono">
                {b.venueId.slice(0, 8)}… / {b.courtId.slice(0, 8)}…
              </div>
            ),
          },
          {
            key: "user",
            header: "Creator",
            render: (b) => <span className="admin-mono">{b.creatorUserId.slice(0, 10)}…</span>,
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
            render: (b) => <BookingStatusActions bookingId={b._id} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
