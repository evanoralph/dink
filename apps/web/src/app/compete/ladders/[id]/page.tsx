import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { JoinButton } from "@/components/compete/JoinButton";
import { LadderActions } from "@/components/compete/LadderActions";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type Data = {
  ladder: { _id: string; name: string; city: string };
  entries: Array<{ userId: string; displayName: string; rank: number; wins: number; losses: number }>;
  challenges: Array<{
    _id: string;
    challengerId: string;
    defenderId: string;
    status: string;
    challengerName: string;
    defenderName: string;
  }>;
  membership: { userId: string; rank: number } | null;
};

export default async function LadderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<Data>(`/api/v1/ladders/${id}`);
  logInfo("page.ladderDetail", { ladderId: id, entries: data.entries.length });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.ladder.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>{data.ladder.name}</h1>
        <p style={{ color: "var(--text-muted)" }}>Challenge up to 3 ranks above you.</p>
        {user && !data.membership && <JoinButton path={`/ladders/${id}/join`} />}

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <strong>Ranks</strong>
          <ol style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {data.entries.map((e) => (
              <li key={e.userId}>
                {e.displayName} · {e.wins}-{e.losses}
              </li>
            ))}
          </ol>
        </div>

        {user && data.membership && (
          <LadderActions
            ladderId={id}
            userId={user._id}
            myRank={data.membership.rank}
            entries={data.entries}
            challenges={data.challenges}
          />
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/compete/ladders" style={{ color: "var(--court-500)", fontWeight: 700 }}>All ladders</Link>
        </p>
      </main>
    </>
  );
}
