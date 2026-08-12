import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { CoachRequestForm } from "@/components/community/CoachRequestForm";
import { CoachReviewForm } from "@/components/community/CoachReviewForm";
import { CoachRespondButtons } from "@/components/community/CoachRespondButtons";
import { FriendButton } from "@/components/FriendButton";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { CoachProfile } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type Review = { _id: string; rating: number; comment?: string; displayName?: string; createdAt: string };
type RequestRow = {
  _id: string;
  status: string;
  startsAt: string;
  playerUserId: string;
  coachUserId: string;
};

export default async function CoachDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<{
    profile: CoachProfile;
    reviews: Review[];
    myRequest: RequestRow | null;
  }>(`/api/v1/coaches/${id}`);
  logInfo("page.coachDetail", { coachUserId: id, reviews: data.reviews.length });

  const mine = user?._id === id;
  const canReview =
    Boolean(user) &&
    data.myRequest &&
    data.myRequest.playerUserId === user?._id &&
    ["accepted", "completed"].includes(data.myRequest.status) &&
    new Date(data.myRequest.startsAt).getTime() <= Date.now();

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.profile.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>{data.profile.displayName || "Coach"}</h1>
        <p style={{ color: "var(--text-muted)" }}>
          ₱{data.profile.hourlyRate}/hr
          {data.profile.ratingCount ? ` · ${data.profile.ratingAvg}★ (${data.profile.ratingCount})` : " · New coach"}
        </p>
        {data.profile.bio && <p style={{ maxWidth: 560 }}>{data.profile.bio}</p>}
        {user && !mine && (
          <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
            <FriendButton userId={id} />
          </div>
        )}

        {user && !mine && <CoachRequestForm coachUserId={id} />}
        {user && mine && data.myRequest && (
          <div className="card" style={{ padding: 20, marginTop: 16 }}>
            <p style={{ margin: 0 }}>Latest request status: {data.myRequest.status}</p>
          </div>
        )}
        {user && data.myRequest && data.myRequest.coachUserId === user._id && (
          <CoachRespondButtons requestId={data.myRequest._id} status={data.myRequest.status} />
        )}
        {canReview && data.myRequest && <CoachReviewForm requestId={data.myRequest._id} />}

        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <strong>Reviews</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {data.reviews.map((r) => (
              <li key={r._id}>
                {r.rating}★ · {r.displayName || "Player"}
                {r.comment ? ` — ${r.comment}` : ""}
              </li>
            ))}
            {data.reviews.length === 0 && <li>No reviews yet</li>}
          </ul>
        </div>
        <p style={{ marginTop: 16 }}>
          <Link href="/coaches" style={{ color: "var(--court-500)", fontWeight: 700 }}>
            All coaches
          </Link>
        </p>
      </main>
    </>
  );
}
