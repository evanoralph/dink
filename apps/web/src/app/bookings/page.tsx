import { AppNav } from "@/components/AppNav";
import { BookingCancelButton } from "@/components/BookingCancelButton";
import { BookingPaymentActions } from "@/components/BookingPaymentActions";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import Link from "next/link";
import { logInfo } from "@/lib/logger";

type CancelPolicy = {
  unpaid: string;
  confirmed: string;
  tooLate: string;
};

export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string; bookingId?: string }>;
}) {
  const user = await getCurrentUser();
  const params = await searchParams;

  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>
            Please <Link href="/login">log in</Link> to see bookings.
          </p>
        </main>
      </>
    );
  }

  let bookings: Booking[] = [];
  let policy: CancelPolicy | null = null;
  try {
    const [list, cancelPolicy] = await Promise.all([
      apiFetch<Booking[]>("/api/v1/bookings"),
      apiFetch<CancelPolicy>("/api/v1/bookings/cancel-policy"),
    ]);
    bookings = list;
    policy = cancelPolicy;
    logInfo("page.bookings", {
      count: bookings.length,
      paid: params.paid || null,
      cancelled: params.cancelled || null,
      bookingId: params.bookingId || null,
      pending: bookings.filter((b) => b.status === "pending_payment").length,
      expired: bookings.filter((b) => b.status === "expired").length,
    });
  } catch {
    bookings = [];
  }

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Your schedule</div>
        <h1 className="display" style={{ margin: "12px 0 28px" }}>
          Bookings
        </h1>

        {policy && (
          <p className="card" style={{ padding: 16, marginBottom: 16, color: "var(--text-muted)" }}>
            Cancel policy: {policy.unpaid} {policy.confirmed}
          </p>
        )}

        {params.paid === "1" && (
          <p className="card" style={{ padding: 16, marginBottom: 16 }}>
            Payment submitted. If status is still pending, wait a moment for confirmation (webhook), or
            tap <strong>Pay now</strong> to resume checkout.
            {params.bookingId ? ` Booking ${params.bookingId}.` : ""}
          </p>
        )}
        {params.cancelled === "1" && (
          <p className="card" style={{ padding: 16, marginBottom: 16 }}>
            Checkout cancelled. Retry payment below before the hold expires — after that the slot is
            released.
          </p>
        )}

        <div style={{ display: "grid", gap: 12 }}>
          {bookings.map((b) => (
            <div
              key={b._id}
              className="card"
              style={{
                padding: 18,
                outline: params.bookingId === b._id ? "2px solid var(--volt-400)" : undefined,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <Link href={`/bookings/${b._id}`} style={{ fontWeight: 700 }}>
                  {new Date(b.startsAt).toLocaleString()}
                </Link>
                <span
                  style={{
                    textTransform: "uppercase",
                    fontSize: 12,
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  {b.status}
                </span>
              </div>
              <div style={{ marginTop: 8, fontFamily: "var(--font-mono)" }}>
                ₱{b.total} {b.currency}
              </div>
              {b.latestPayment && (
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  Payment: {b.latestPayment.status}
                  {b.latestPayment.provider ? ` · ${b.latestPayment.provider}` : ""}
                </div>
              )}
              {b.status === "pending_payment" && b.expiresAt && (
                <div style={{ marginTop: 6, fontSize: 13, color: "var(--text-muted)" }}>
                  Hold expires {new Date(b.expiresAt).toLocaleTimeString()}
                </div>
              )}
              <BookingPaymentActions
                bookingId={b._id}
                venueId={b.venueId}
                status={b.status}
                latestPayment={b.latestPayment}
              />
              <BookingCancelButton
                bookingId={b._id}
                status={b.status}
                policyHint={
                  b.status === "pending_payment"
                    ? policy?.unpaid
                    : b.status === "confirmed"
                      ? policy?.confirmed
                      : undefined
                }
              />
            </div>
          ))}
          {bookings.length === 0 && (
            <p className="card" style={{ padding: 18 }}>
              No bookings yet. <Link href="/courts">Browse courts</Link>.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
