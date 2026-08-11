import { Suspense } from "react";
import { FilterBar } from "@/components/admin/FilterBar";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { TrendChart } from "@/components/admin/TrendChart";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { apiFetch } from "@/lib/api";
import {
  buildQuery,
  formatDate,
  formatMoney,
  type AdminSearchParams,
} from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type ReportSummary = {
  from: string;
  to: string;
  totals: {
    bookingsCreated: number;
    confirmed: number;
    cancelled: number;
    conversion: number;
    gmv: number;
    refundedAmount: number;
    revenueConfirmed: number;
  };
  byStatus: { status: string; count: number }[];
  series: { date: string; bookings: number; revenue: number }[];
};

export default async function VenueReportsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<ReportSummary>(
    `/api/v1/venue/reports${buildQuery(params)}`,
  );
  logInfo("page.venueReports", {
    bookings: data.totals.bookingsCreated,
    gmv: data.totals.gmv,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Reports</h1>
          <p className="admin-muted">
            {formatDate(data.from)} → {formatDate(data.to)}
          </p>
        </div>
      </div>

      <ModuleTip>
        Narrow the date range to compare busy weeks. Conversion is confirmed bookings divided by
        bookings created in the selected window.
      </ModuleTip>

      <Suspense>
        <FilterBar
          fields={[
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
            { name: "venueId", label: "Venue ID", type: "text" },
          ]}
        />
      </Suspense>

      <KpiGrid
        items={[
          {
            label: "Bookings created",
            value: data.totals.bookingsCreated,
            hint: "In selected range",
          },
          { label: "Confirmed", value: data.totals.confirmed },
          { label: "Cancelled", value: data.totals.cancelled },
          {
            label: "Conversion",
            value: `${Math.round((data.totals.conversion || 0) * 100)}%`,
            hint: "Confirmed / created",
          },
          {
            label: "Revenue (confirmed)",
            value: formatMoney(data.totals.revenueConfirmed),
          },
          { label: "GMV (paid)", value: formatMoney(data.totals.gmv) },
          {
            label: "Refunded",
            value: formatMoney(data.totals.refundedAmount),
          },
        ]}
      />

      <div className="admin-grid-2">
        <div className="admin-panel">
          <h2>Bookings & revenue</h2>
          <TrendChart
            data={data.series}
            lines={[
              { key: "bookings", name: "Bookings", color: "#111827" },
              { key: "revenue", name: "Revenue", color: "#65a30d" },
            ]}
          />
        </div>
        <div className="admin-panel">
          <h2>By status</h2>
          {data.byStatus.length === 0 ? (
            <p className="admin-muted">No bookings in range</p>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Status</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {data.byStatus.map((row) => (
                  <tr key={row.status}>
                    <td>{row.status}</td>
                    <td className="admin-mono">{row.count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
