import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { BookingCancelButton } from "@/components/BookingCancelButton";
import { BookingPaymentActions } from "@/components/BookingPaymentActions";
import { InviteToPayForm, RemindUnpaidButton } from "@/components/BookingSplitActions";
import { ReportButton } from "@/components/ReportButton";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Booking } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type Participant = {
  userId: string;
  role: string;
  paymentShare: number;
  paymentStatus: string;
  displayName?: string;
  email?: string;
  reliabilityLevel?: string;
};

export default async function BookingDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { id } = await params;
  const q = await searchParams;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>
            Please <Link href="/login">log in</Link>.
          </p>
        </main>
      </>
    );
  }

  const data = await apiFetch<{
    booking: Booking;
    participants: Participant[];
    payments: Array<{ _id: string; status: string; provider: string; amount: number; userId: string }>;
    split: boolean;
    myPaymentStatus: string | null;
    myPaymentShare: number;
  }>(`/api/v1/bookings/${id}`);
  const isOrganizer = data.booking.creatorUserId === user._id;
  const latestMine = [...data.payments]
    .filter((p) => p.userId === user._id)
    .sort()
    .at(-1);
  logInfo("page.bookingDetail", {
    bookingId: id,
    split: data.split,
    roster: data.participants.length,
  });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <p>
          <Link href="/bookings" style={{ color: "var(--court-500)", fontWeight: 700 }}>
            ← All bookings
          </Link>
        </p>
        <div className="label">{data.split ? "Split pay" : "Solo pay"}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>
          Booking
        </h1>
        <p style={{ color: "var(--text-muted)" }}>
          {new Date(data.booking.startsAt).toLocaleString()} · ₱{data.booking.total}{" "}
          {data.booking.currency} · {data.booking.status}
        </p>
        {q.paid === "1" && (
          <p className="card" style={{ padding: 16, marginTop: 16 }}>
            Payment submitted. Refresh if status is still pending.
          </p>
        )}

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <strong>Who paid</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
            {data.participants.map((p) => (
              <li key={p.userId}>
                {p.displayName} ({p.role}) · ₱{p.paymentShare} · {p.paymentStatus}
                {p.reliabilityLevel && p.reliabilityLevel !== "new" ? ` · ${p.reliabilityLevel}` : ""}
                {isOrganizer && p.email ? ` · ${p.email}` : ""}
              </li>
            ))}
          </ul>
          {isOrganizer && data.split && (
            <div style={{ marginTop: 16 }}>
              <RemindUnpaidButton bookingId={id} />
            </div>
          )}
        </div>

        {data.booking.status === "pending_payment" && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <p style={{ marginTop: 0 }}>
              Your share: ₱{data.myPaymentShare} ({data.myPaymentStatus || "pending"})
            </p>
            <BookingPaymentActions
              bookingId={id}
              venueId={data.booking.venueId}
              status={data.booking.status}
              latestPayment={
                latestMine
                  ? {
                      _id: latestMine._id,
                      status: latestMine.status,
                      provider: latestMine.provider,
                    }
                  : data.booking.latestPayment
              }
            />
          </div>
        )}

        {isOrganizer && ["pending_payment", "confirmed"].includes(data.booking.status) && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <InviteToPayForm bookingId={id} />
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
              Invited players must already have a Dink account. After a second payer joins, checkout
              charges each share and confirms when all are paid.
            </p>
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
          <BookingCancelButton bookingId={id} status={data.booking.status} />
          <ReportButton targetType="user" targetId={data.booking.creatorUserId} label="Report organizer" />
        </div>
      </main>
    </>
  );
}
