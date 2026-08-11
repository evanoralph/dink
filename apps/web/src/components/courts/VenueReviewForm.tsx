"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ApiError, clientApiFetch } from "@/lib/api-client";
import { logInfo, logWarn } from "@/lib/logger";

export function VenueReviewForm({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await clientApiFetch(`/api/v1/venues/${venueId}/reviews`, {
        method: "POST",
        body: { rating, comment: comment.trim() || undefined },
      });
      logInfo("courts.review.submitted", { venueId, rating });
      setComment("");
      router.refresh();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not submit review";
      logWarn("courts.review.fail", { venueId, message });
      setError(message);
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="card review-form" onSubmit={onSubmit}>
      <strong>Leave a review</strong>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14 }}>
        Available after a confirmed or completed booking at this venue.
      </p>
      <label className="courts-filter-field">
        <span>Rating</span>
        <select
          className="input"
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
        >
          {[5, 4, 3, 2, 1].map((n) => (
            <option key={n} value={n}>
              {n} star{n === 1 ? "" : "s"}
            </option>
          ))}
        </select>
      </label>
      <label className="courts-filter-field">
        <span>Comment</span>
        <textarea
          className="input"
          style={{ height: 96, padding: 12, resize: "vertical" }}
          value={comment}
          maxLength={2000}
          placeholder="How were the courts?"
          onChange={(e) => setComment(e.target.value)}
        />
      </label>
      {error && <p style={{ margin: 0, color: "var(--status-danger)" }}>{error}</p>}
      <button type="submit" className="btn-primary" disabled={pending} style={{ width: "fit-content" }}>
        {pending ? "Submitting…" : "Submit review"}
      </button>
    </form>
  );
}
