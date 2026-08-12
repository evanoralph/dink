import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { ChannelChat } from "@/components/ChannelChat";
import { CreateGameForm } from "@/components/GameActions";
import { GroupJoinLeave } from "@/components/community/GroupJoinLeave";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Game, Group, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type Member = { userId: string; role: string; displayName?: string };

export default async function GroupDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<{
    group: Group;
    members: Member[];
    membership: { userId: string; role: string } | null;
  }>(`/api/v1/groups/${id}`);
  const feed = await apiFetch<{ games: Game[] }>(`/api/v1/groups/${id}/feed`);
  let venues: Venue[] = [];
  try {
    venues = await apiFetch<Venue[]>("/api/v1/venues");
  } catch {
    venues = [];
  }
  const joined = Boolean(data.membership);
  logInfo("page.groupDetail", { groupId: id, members: data.members.length, games: feed.games.length });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.group.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>{data.group.name}</h1>
        <p style={{ color: "var(--text-muted)" }}>{data.group.description || "Local pickleball group"}</p>
        <div style={{ marginTop: 16 }}>
          {user ? (
            <GroupJoinLeave
              groupId={id}
              joined={joined}
              isOwner={data.membership?.role === "owner"}
            />
          ) : (
            <Link href={`/login?next=/groups/${id}`} className="btn-primary">
              Log in to join
            </Link>
          )}
        </div>

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <strong>Members · {data.group.memberCount}</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {data.members.map((m) => (
              <li key={m.userId}>
                {m.displayName || m.userId.slice(0, 8)} · {m.role}
              </li>
            ))}
          </ul>
        </div>

        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <strong>Open play feed</strong>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            {feed.games.map((g) => (
              <Link key={g._id} href={`/games/${g._id}`} style={{ display: "block" }}>
                {new Date(g.startsAt).toLocaleString()} · {g.format} · {g.playerCount}/{g.capacity}
                {(g.waitlistCount || 0) > 0 ? ` · waitlist ${g.waitlistCount}` : ""}
              </Link>
            ))}
            {feed.games.length === 0 && <p style={{ color: "var(--text-muted)", margin: 0 }}>No sessions posted yet</p>}
          </div>
        </div>

        {user && joined && venues.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <CreateGameForm venues={venues} groupId={id} />
          </div>
        )}

        {user && joined && <ChannelChat channelType="group" channelId={id} />}
      </main>
    </>
  );
}
