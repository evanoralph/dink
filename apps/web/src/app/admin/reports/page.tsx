import { Suspense } from "react";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { FilterBar } from "@/components/admin/FilterBar";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { TrendChart } from "@/components/admin/TrendChart";
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
    newUsers: number;
    bookingsCreated: number;
    confirmed: number;
    cancelled: number;
    conversion: number;
    gmv: number;
    refundedAmount: number;
  };
  byStatus: { status: string; count: number }[];
  topVenues: { venueId: string; name: string; city: string; count: number; revenue: number }[];
  topCities: { city: string; count: number; revenue: number }[];
  series: { date: string; bookings: number; revenue: number }[];
};

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<ReportSummary>(
    `/api/v1/admin/reports${buildQuery(params)}`,
  );
  logInfo("page.adminReports", {
    bookings: data.totals.bookingsCreated,
    gmv: data.totals.gmv,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Reports</h1>
          <p className="admin-muted">
            {formatDate(data.from)} → {formatDate(data.to)}
          </p>
        </div>
        <Suspense>
          <CsvExportButton entity="report" />
        </Suspense>
      </div>

      <Suspense>
        <FilterBar
          fields={[
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
          ]}
        />
      </Suspense>

      <KpiGrid
        items={[
          { label: "New users", value: data.totals.newUsers },
          { label: "Bookings created", value: data.totals.bookingsCreated },
          { label: "Confirmed", value: data.totals.confirmed },
          { label: "Cancelled", value: data.totals.cancelled },
          {
            label: "Conversion",
            value: `${Math.round((data.totals.conversion || 0) * 100)}%`,
          },
          { label: "GMV", value: formatMoney(data.totals.gmv) },
          { label: "Refunded", value: formatMoney(data.totals.refundedAmount) },
        ]}
      />

      <div className="admin-panel">
        <h2>Daily bookings & revenue</h2>
        <TrendChart
          data={data.series}
          lines={[
            { key: "bookings", name: "Bookings", color: "#111827" },
            { key: "revenue", name: "Revenue", color: "#65a30d" },
          ]}
        />
      </div>

      <div className="admin-grid-2">
        <div className="admin-panel">
          <h2>Top venues</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Venue</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topVenues.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-table-empty">
                    No venue data in range
                  </td>
                </tr>
              ) : (
                data.topVenues.map((v) => (
                  <tr key={v.venueId}>
                    <td>
                      <strong>{v.name}</strong>
                      <div className="admin-muted">{v.city}</div>
                    </td>
                    <td>{v.count}</td>
                    <td>{formatMoney(v.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="admin-panel">
          <h2>Top cities</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>City</th>
                <th>Bookings</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {data.topCities.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-table-empty">
                    No city data in range
                  </td>
                </tr>
              ) : (
                data.topCities.map((c) => (
                  <tr key={c.city}>
                    <td>{c.city}</td>
                    <td>{c.count}</td>
                    <td>{formatMoney(c.revenue)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <h2 style={{ marginTop: 20 }}>By booking status</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>Status</th>
                <th>Count</th>
              </tr>
            </thead>
            <tbody>
              {data.byStatus.map((s) => (
                <tr key={s.status}>
                  <td>{s.status}</td>
                  <td>{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
