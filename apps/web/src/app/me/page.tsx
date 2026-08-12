import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { AccountPrivacyActions } from "@/components/AccountPrivacyActions";
import { LogoutButton } from "@/components/LogoutButton";
import { apiFetch } from "@/lib/api";
import { logInfo } from "@/lib/logger";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>Please <Link href="/login">log in</Link>.</p>
        </main>
      </>
    );
  }
  type HistoryRow = {
    _id: string;
    status: string;
    sets?: Array<{ setNumber: number; team1Score: number; team2Score: number }>;
    game?: { startsAt?: string; format?: string } | null;
  };
  type RatingRow = {
    _id: string;
    matchId: string;
    before: number;
    after: number;
    delta: number;
    reversed?: boolean;
    createdAt: string;
  };
  let matches: HistoryRow[] = [];
  let rating = user.profile.rating ?? 1000;
  let ratingHistory: RatingRow[] = [];
  try {
    matches = await apiFetch<HistoryRow[]>("/api/v1/matches");
  } catch {
    matches = [];
  }
  try {
    const me = await apiFetch<{ rating: number }>("/api/v1/ratings/me");
    rating = me.rating;
    ratingHistory = await apiFetch<RatingRow[]>("/api/v1/ratings/history");
  } catch {
    logInfo("page.me.ratings.skip", { userId: user._id });
  }
  const inviteCode = user.profile.inviteCode;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = inviteCode ? `${appUrl}/signup?invite=${encodeURIComponent(inviteCode)}` : null;
  logInfo("page.me", {
    userId: user._id,
    matches: matches.length,
    hasInvite: Boolean(inviteCode),
    rating,
    ratingHistory: ratingHistory.length,
  });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Profile</div>
        <h1 className="display" style={{ margin: "12px 0 20px" }}>{user.profile.displayName}</h1>
        <div className="card" style={{ padding: 20, maxWidth: 520 }}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>City:</strong> {user.profile.city || "—"}</p>
          <p><strong>Skill:</strong> {user.profile.skillLevel ?? "—"}</p>
          <p>
            <strong>Rating:</strong> {rating}{" "}
            <Link href="/compete" style={{ color: "var(--court-500)", fontWeight: 600 }}>
              Compete
            </Link>
          </p>
          <p><strong>Roles:</strong> {(user.roles ?? []).join(", ") || "—"}</p>
          <p><strong>Match history:</strong> {matches.length}</p>
          <p>
            <strong>Reliability:</strong>{" "}
            {(user.profile.reliabilityLevel || "new").replace("_", " ")}
            {typeof user.profile.reliabilityScore === "number" ? ` (${user.profile.reliabilityScore}%)` : ""}
            {" · "}
            {user.profile.reliabilityCompleted || 0} completed / {user.profile.reliabilityNoShows || 0} no-shows
          </p>
          {inviteUrl && (
            <p>
              <strong>Invite friends:</strong>{" "}
              <code>{inviteCode}</code>
              {" · "}
              {user.profile.inviteCount || 0} signups
              <br />
              <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{inviteUrl}</span>
            </p>
          )}
          <div style={{ marginTop: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/onboarding" className="btn-secondary">Edit onboarding</Link>
            <Link href="/friends" className="btn-secondary">Friends</Link>
            <Link href="/groups" className="btn-secondary">Groups</Link>
            <Link href="/coaches" className="btn-secondary">Coaches</Link>
            <Link href="/list-your-venue" className="btn-secondary">List your venue</Link>
            <LogoutButton />
          </div>
        </div>
        {ratingHistory.length > 0 && (
          <div className="card" style={{ padding: 20, maxWidth: 520, marginTop: 16 }}>
            <strong>Rating history</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
              {ratingHistory.slice(0, 12).map((r) => (
                <li key={r._id}>
                  {r.delta >= 0 ? "+" : ""}
                  {r.delta} → {r.after}
                  {r.reversed ? " · reversed" : ""}
                  {" · "}
                  {new Date(r.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          </div>
        )}
        {matches.length > 0 && (
          <div className="card" style={{ padding: 20, maxWidth: 520, marginTop: 16 }}>
            <strong>Recent matches</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
              {matches.slice(0, 8).map((m) => (
                <li key={m._id}>
                  {m.game?.format || "match"} · {m.status}
                  {m.game?.startsAt ? ` · ${new Date(m.game.startsAt).toLocaleDateString()}` : ""}
                  {" · "}
                  <Link href={`/matches/${m._id}/share`} style={{ color: "var(--court-500)", fontWeight: 600 }}>
                    Share card
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <AccountPrivacyActions />
      </main>
    </>
  );
}
