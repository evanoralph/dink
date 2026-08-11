import Link from "next/link";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrendChart } from "@/components/admin/TrendChart";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/admin";
import type { Booking, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type DashboardStats = {
  from: string;
  to: string;
  kpis: {
    usersTotal: number;
    venuesPending: number;
    venuesApproved: number;
    venuesSuspended: number;
    courtsActive: number;
    courtsTotal: number;
    bookingsTotal: number;
    bookingsConfirmed: number;
    bookingsCancelled: number;
    bookingsPendingPayment: number;
    unpaidPayments: number;
    gmv: number;
    refundedAmount: number;
  };
  series: {
    date: string;
    bookings: number;
    bookingRevenue: number;
    gmv: number;
    paidCount: number;
  }[];
  recentBookings: Booking[];
  pendingVenues: Venue[];
};

export default async function AdminDashboardPage() {
  const data = await apiFetch<DashboardStats>("/api/v1/admin/dashboard?days=30");
  logInfo("page.adminDashboard", {
    users: data.kpis.usersTotal,
    bookings: data.kpis.bookingsTotal,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Dashboard</h1>
          <p className="admin-muted">
            {formatDate(data.from)} → {formatDate(data.to)}
          </p>
        </div>
        <Link href="/admin/reports" className="btn-secondary" style={{ height: 36, padding: "0 14px" }}>
          Open reports
        </Link>
      </div>

      <KpiGrid
        items={[
          { label: "Users", value: data.kpis.usersTotal },
          { label: "GMV (paid)", value: formatMoney(data.kpis.gmv) },
          { label: "Bookings", value: data.kpis.bookingsTotal },
          { label: "Confirmed", value: data.kpis.bookingsConfirmed },
          { label: "Pending payment", value: data.kpis.bookingsPendingPayment },
          { label: "Unpaid payments", value: data.kpis.unpaidPayments },
          { label: "Venues pending", value: data.kpis.venuesPending },
          {
            label: "Courts active",
            value: `${data.kpis.courtsActive}/${data.kpis.courtsTotal}`,
          },
        ]}
      />

      <div className="admin-grid-2">
        <div className="admin-panel">
          <h2>Bookings & GMV (30d)</h2>
          <TrendChart
            data={data.series}
            lines={[
              { key: "bookings", name: "Bookings", color: "#111827" },
              { key: "gmv", name: "GMV", color: "#65a30d" },
            ]}
          />
        </div>
        <div className="admin-panel">
          <h2>Pending venues</h2>
          {data.pendingVenues.length === 0 ? (
            <p className="admin-muted">No venues awaiting approval</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.pendingVenues.map((v) => (
                <Link key={v._id} href="/admin/venues?status=pending" style={{ display: "block" }}>
                  <strong>{v.name}</strong>
                  <div className="admin-muted">
                    {v.city} · <StatusBadge status={v.status} />
                  </div>
                </Link>
              ))}
            </div>
          )}
          <h2 style={{ marginTop: 20 }}>Recent bookings</h2>
          {data.recentBookings.length === 0 ? (
            <p className="admin-muted">No bookings yet</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.recentBookings.map((b) => (
                <div key={b._id}>
                  <div className="admin-mono">{b._id.slice(0, 8)}…</div>
                  <div className="admin-muted">
                    <StatusBadge status={b.status} /> · {formatMoney(b.total, b.currency)} ·{" "}
                    {formatDate(b.startsAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
