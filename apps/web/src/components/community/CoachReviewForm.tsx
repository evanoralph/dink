"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

export function CoachReviewForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await clientApiFetch("/coaches/reviews", {
        method: "POST",
        body: { requestId, rating, comment: comment || undefined },
      });
      logInfo("coach.review.ok", { requestId, rating });
      setMessage("Thanks for the review");
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed";
      setMessage(msg);
      logError("coach.review.fail", { message: msg });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 20, marginTop: 16, display: "grid", gap: 12 }}>
      <strong>Review this session</strong>
      <select className="input" value={rating} onChange={(e) => setRating(Number(e.target.value))}>
        {[5, 4, 3, 2, 1].map((n) => (
          <option key={n} value={n}>
            {n} stars
          </option>
        ))}
      </select>
      <textarea className="input" rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Optional comment" />
      {message && <p style={{ margin: 0 }}>{message}</p>}
      <button className="btn-primary" type="submit" disabled={busy}>
        {busy ? "Saving…" : "Submit review"}
      </button>
    </form>
  );
}
