import { AppNav } from "@/components/AppNav";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import Link from "next/link";
import { logInfo } from "@/lib/logger";

export default async function BookingsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>Please <Link href="/login">log in</Link> to see bookings.</p>
        </main>
      </>
    );
  }

  let bookings: Booking[] = [];
  try {
    bookings = await apiFetch<Booking[]>("/api/v1/bookings");
    logInfo("page.bookings", { count: bookings.length });
  } catch {
    bookings = [];
  }

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Your schedule</div>
        <h1 className="display" style={{ margin: "12px 0 28px" }}>Bookings</h1>
        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => (
            <div key={b._id} className="card" style={{ padding: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{new Date(b.startsAt).toLocaleString()}</strong>
                <span style={{ textTransform: "uppercase", fontSize: 12, letterSpacing: "0.08em", fontWeight: 700 }}>{b.status}</span>
              </div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}>
                ₱{b.total} {b.currency}
              </div>
            </div>
          ))}
          {bookings.length === 0 && <p className="card" style={{ padding: 18 }}>No bookings yet. <Link href="/courts">Browse courts</Link>.</p>}
        </div>
      </main>
    </>
  );
}
