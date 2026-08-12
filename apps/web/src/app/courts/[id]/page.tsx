import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { BookingActions } from "@/components/BookingActions";
import { BuyPackButton } from "@/components/BuyPackButton";
import { VenueDetailMap } from "@/components/courts/VenueDetailMap";
import { VenueRating } from "@/components/courts/VenueRating";
import { VenueReviewForm } from "@/components/courts/VenueReviewForm";
import { ReportButton } from "@/components/ReportButton";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { getPublicFeatureFlags } from "@/lib/feature-flags";
import { getPaymentConfig } from "@/lib/payments";
import type { Court, Venue, VenueReview } from "@/lib/types";
import { track } from "@/lib/analytics";
import { logInfo } from "@/lib/logger";

export default async function CourtDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = new Date().toISOString().slice(0, 10);
  const user = await getCurrentUser();
  const [flags, paymentConfig] = await Promise.all([getPublicFeatureFlags(), getPaymentConfig()]);
  const detail = await apiFetch<{ venue: Venue; courts: Court[] }>(`/api/v1/venues/${id}`);
  const availability = await apiFetch<{
    slots: Array<{
      courtId: string;
      courtName: string;
      startsAt: string;
      endsAt: string;
      available: boolean;
      price: number;
      currency: string;
    }>;
  }>(`/api/v1/venues/${id}/availability?date=${date}`);

  type Pack = {
    _id: string;
    name: string;
    price: number;
    discountPct: number;
    durationDays: number;
    visitsIncluded?: number;
  };
  let packs: Pack[] = [];
  try {
    packs = await apiFetch<Pack[]>(`/api/v1/venues/${id}/packs`);
  } catch {
    packs = [];
  }

  let reviews: VenueReview[] = [];
  let ratingAvg = detail.venue.ratingAvg ?? 0;
  let ratingCount = detail.venue.ratingCount ?? 0;
  try {
    const reviewData = await apiFetch<{
      reviews: VenueReview[];
      ratingAvg: number;
      ratingCount: number;
    }>(`/api/v1/venues/${id}/reviews`);
    reviews = reviewData.reviews;
    ratingAvg = reviewData.ratingAvg;
    ratingCount = reviewData.ratingCount;
  } catch {
    // Reviews endpoint failure should not block booking
  }

  const amenity = [
    detail.venue.indoor ? "Indoor" : "Outdoor",
    detail.venue.covered ? "Covered" : null,
    detail.venue.airConditioned ? "Air-conditioned" : null,
  ]
    .filter(Boolean)
    .join(" · ");

  logInfo("page.courtDetail", {
    venueId: id,
    slots: availability.slots.length,
    reviews: reviews.length,
    packs: packs.length,
    images: detail.venue.imageUrls?.length || 0,
    paymentsStub: flags.payments_stub,
    paymentProvider: paymentConfig.provider,
    redirectCheckout: paymentConfig.redirectCheckout,
  });
  track("venue_viewed", { venueId: id, city: detail.venue.city, userId: user?._id });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{detail.venue.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>
          {detail.venue.name}
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 12 }}>
          {detail.venue.address} · {detail.courts.length} courts · {amenity}
        </p>
        <div style={{ marginBottom: 20 }}>
          <VenueRating avg={ratingAvg} count={ratingCount} />
        </div>

        {detail.venue.imageUrls && detail.venue.imageUrls.length > 0 && (
          <div className="court-detail-gallery">
            {detail.venue.imageUrls.map((src) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={src} src={src} alt={`${detail.venue.name} court`} />
            ))}
          </div>
        )}

        {detail.venue.description && (
          <p style={{ maxWidth: 640, marginBottom: 24, lineHeight: 1.5 }}>
            {detail.venue.description}
          </p>
        )}

        <VenueDetailMap location={detail.venue.location} name={detail.venue.name} />

        <h2 style={{ margin: "0 0 12px", font: "400 28px/1 var(--font-display)", textTransform: "uppercase" }}>
          Book today
        </h2>
        <p style={{ color: "var(--text-muted)", marginBottom: 20 }}>
          Availability for {date}
        </p>
        <BookingActions
          venueId={id}
          slots={availability.slots}
          paymentsStub={flags.payments_stub}
          paymentProvider={paymentConfig.provider}
          redirectCheckout={paymentConfig.redirectCheckout}
        />

        {packs.length > 0 && (
          <div className="card" style={{ padding: 20, marginTop: 24 }}>
            <strong>Membership packs</strong>
            <p style={{ color: "var(--text-muted)", margin: "8px 0 12px" }}>
              Active pass = discount at booking. Stub checkout confirms instantly.
            </p>
            <ul style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
              {packs.map((p) => (
                <li key={p._id} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <span>
                    {p.name} · ₱{p.price} · {p.discountPct}% off · {p.durationDays} days
                    {p.visitsIncluded ? ` · ${p.visitsIncluded} visits` : ""}
                  </span>
                  {user ? (
                    <BuyPackButton packId={p._id} label={`Buy ${p.name}`} />
                  ) : (
                    <Link href={`/login?next=/courts/${id}`} style={{ color: "var(--court-500)", fontWeight: 700 }}>
                      Log in to buy
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <h2
          style={{
            margin: "36px 0 8px",
            font: "400 28px/1 var(--font-display)",
            textTransform: "uppercase",
          }}
        >
          Reviews
        </h2>
        <VenueRating avg={ratingAvg} count={ratingCount} />

        <div className="reviews-list">
          {reviews.length === 0 ? (
            <p className="card" style={{ padding: 16, color: "var(--text-muted)" }}>
              No reviews yet. Be the first after your booking.
            </p>
          ) : (
            reviews.map((review) => (
              <article key={review._id} className="card review-item">
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                  <strong>{review.displayName || "Player"}</strong>
                  <VenueRating avg={review.rating} count={1} compact hideEmpty />
                </div>
                {review.comment && (
                  <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>{review.comment}</p>
                )}
                {user && (
                  <div style={{ marginTop: 10 }}>
                    <ReportButton targetType="review" targetId={review._id} label="Report review" />
                  </div>
                )}
              </article>
            ))
          )}
        </div>

        {user ? (
          <>
            <VenueReviewForm venueId={id} />
            <div style={{ marginTop: 12 }}>
              <ReportButton targetType="venue" targetId={id} label="Report venue" />
            </div>
          </>
        ) : (
          <p className="card" style={{ padding: 16, color: "var(--text-muted)", marginBottom: 28 }}>
            Sign in to leave a review after booking.
          </p>
        )}
      </main>
    </>
  );
}
