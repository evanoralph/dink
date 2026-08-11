export function VenueRating({
  avg,
  count,
  compact = false,
  hideEmpty = false,
}: {
  avg?: number;
  count?: number;
  compact?: boolean;
  /** When true, render stars for a single rating without "no reviews" empty state */
  hideEmpty?: boolean;
}) {
  const rating = typeof avg === "number" ? avg : 0;
  const n = typeof count === "number" ? count : 0;
  if (n === 0 && !hideEmpty) {
    return (
      <span className="venue-rating venue-rating-empty" style={{ color: "var(--text-muted)" }}>
        {compact ? "No reviews" : "No reviews yet"}
      </span>
    );
  }
  const filled = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span className="venue-rating" title={`${rating} from ${n} review${n === 1 ? "" : "s"}`}>
      <span className="venue-rating-stars" aria-hidden>
        {"★".repeat(filled)}
        {"☆".repeat(5 - filled)}
      </span>{" "}
      {!hideEmpty && <strong>{rating.toFixed(1)}</strong>}
      {!compact && !hideEmpty && <span style={{ color: "var(--text-muted)" }}> ({n})</span>}
    </span>
  );
}
