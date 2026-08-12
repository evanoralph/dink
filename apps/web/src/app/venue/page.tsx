import Link from "next/link";
import { KpiGrid } from "@/components/admin/KpiGrid";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { TrendChart } from "@/components/admin/TrendChart";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { apiFetch } from "@/lib/api";
import { formatDate, formatMoney } from "@/lib/admin";
import type { Booking, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type DashboardStats = {
  venues: Venue[];
  from: string;
  to: string;
  stats: { bookingsToday: number; unpaid: number; revenueToday: number };
  kpis: {
    revenueConfirmed: number;
    gmv: number;
    bookingsTotal: number;
    bookingsConfirmed: number;
    bookingsPendingPayment: number;
    bookingsCancelled: number;
    unpaidPayments: number;
    courtsActive: number;
    courtsTotal: number;
  };
  series: {
    date: string;
    bookings: number;
    bookingRevenue: number;
    gmv: number;
    paidCount: number;
  }[];
  recentBookings: Booking[];
  unpaidBookings: Booking[];
};

export default async function VenueDashboardPage() {
  const data = await apiFetch<DashboardStats>("/api/v1/venue/dashboard?days=30");
  logInfo("page.venueDashboard", {
    venues: data.venues.length,
    bookings: data.kpis.bookingsTotal,
    gmv: data.kpis.gmv,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Dashboard</h1>
          <p className="admin-muted">
            {formatDate(data.from)} → {formatDate(data.to)}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link href="/list-your-venue" className="btn-secondary" style={{ height: 36, padding: "0 14px" }}>
            List another venue
          </Link>
          <Link href="/venue/reports" className="btn-secondary" style={{ height: 36, padding: "0 14px" }}>
            Open reports
          </Link>
        </div>
      </div>

      <ModuleTip>
        Track today’s revenue, unpaid bookings, and court utilization. Use Bookings to confirm walk-ins
        and Payments to review paid vs pending charges for your venues.
      </ModuleTip>

      <KpiGrid
        items={[
          {
            label: "Revenue (confirmed)",
            value: formatMoney(data.kpis.revenueConfirmed),
            hint: "Confirmed booking totals in range",
          },
          {
            label: "GMV (paid)",
            value: formatMoney(data.kpis.gmv),
            hint: "Sum of paid payments",
          },
          {
            label: "Bookings",
            value: data.kpis.bookingsTotal,
            hint: "All-time for your venues",
          },
          { label: "Confirmed", value: data.kpis.bookingsConfirmed },
          {
            label: "Pending payment",
            value: data.kpis.bookingsPendingPayment,
            hint: "Needs follow-up",
          },
          { label: "Cancelled", value: data.kpis.bookingsCancelled },
          {
            label: "Unpaid payments",
            value: data.kpis.unpaidPayments,
            hint: "Payment records still pending",
          },
          {
            label: "Courts active",
            value: `${data.kpis.courtsActive}/${data.kpis.courtsTotal}`,
          },
          {
            label: "Revenue today",
            value: formatMoney(data.stats.revenueToday),
            hint: "Confirmed starts today",
          },
          { label: "Bookings today", value: data.stats.bookingsToday },
          { label: "Unpaid today", value: data.stats.unpaid },
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
          <h2>Unpaid bookings</h2>
          {data.unpaidBookings.length === 0 ? (
            <p className="admin-muted">No pending payment bookings</p>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {data.unpaidBookings.map((b) => (
                <Link key={b._id} href="/venue/bookings?status=pending_payment" style={{ display: "block" }}>
                  <strong className="admin-mono">{b._id.slice(0, 8)}…</strong>
                  <div className="admin-muted">
                    <StatusBadge status={b.status} /> · {formatMoney(b.total, b.currency)} ·{" "}
                    {formatDate(b.startsAt)}
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

      <div className="admin-panel" style={{ marginTop: 16 }}>
        <h2>Your venues</h2>
        {data.venues.length === 0 ? (
          <p className="admin-muted">
            No venues linked to this account.{" "}
            <Link href="/list-your-venue" style={{ fontWeight: 700 }}>
              List your venue
            </Link>
          </p>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {data.venues.map((v) => (
              <div key={v._id}>
                <strong>{v.name}</strong>
                <div className="admin-muted">
                  {v.city} · {v.courtCount} courts · <StatusBadge status={v.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
