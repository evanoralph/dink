import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { AcceptFriendButton } from "@/components/community/AcceptFriendButton";
import { FriendButton } from "@/components/FriendButton";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type FriendRow = {
  _id: string;
  otherUserId: string;
  displayName?: string;
  status: string;
  incoming?: boolean;
};

type Played = { userId: string; displayName?: string; gamesTogether: number };

export default async function FriendsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>
            Please <Link href="/login?next=/friends">log in</Link>.
          </p>
        </main>
      </>
    );
  }

  let friends: FriendRow[] = [];
  let played: Played[] = [];
  try {
    friends = await apiFetch<FriendRow[]>("/api/v1/friends");
    played = await apiFetch<Played[]>("/api/v1/friends/played-with");
  } catch {
    friends = [];
    played = [];
  }
  logInfo("page.friends", { userId: user._id, friends: friends.length, played: played.length });

  const accepted = friends.filter((f) => f.status === "accepted");
  const incoming = friends.filter((f) => f.incoming);
  const outgoing = friends.filter((f) => f.status === "pending" && !f.incoming);

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Social</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Friends</h1>

        <div className="card" style={{ padding: 20, maxWidth: 640 }}>
          <strong>Your friends</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {accepted.map((f) => (
              <li key={f._id}>{f.displayName || f.otherUserId.slice(0, 8)}</li>
            ))}
            {accepted.length === 0 && <li>None yet</li>}
          </ul>
        </div>

        <div className="card" style={{ padding: 20, maxWidth: 640, marginTop: 16 }}>
          <strong>Requests</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
            {incoming.map((f) => (
              <li key={f._id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                {f.displayName} wants to connect
                <AcceptFriendButton userId={f.otherUserId} />
              </li>
            ))}
            {outgoing.map((f) => (
              <li key={f._id}>{f.displayName} · pending</li>
            ))}
            {incoming.length === 0 && outgoing.length === 0 && <li>No pending requests</li>}
          </ul>
        </div>

        <div className="card" style={{ padding: 20, maxWidth: 640, marginTop: 16 }}>
          <strong>Players you play with</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18, display: "grid", gap: 8 }}>
            {played.map((p) => (
              <li key={p.userId} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                {p.displayName} · {p.gamesTogether} games
                <FriendButton userId={p.userId} label="Follow" />
              </li>
            ))}
            {played.length === 0 && <li>Join a game to see partners here</li>}
          </ul>
        </div>
      </main>
    </>
  );
}
