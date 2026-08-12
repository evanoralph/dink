import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { JoinButton } from "@/components/compete/JoinButton";
import { LeagueResultForm } from "@/components/compete/LeagueResultForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type Data = {
  league: { _id: string; name: string; city: string; seasonName: string; status: string; format: string };
  standings: Array<{ userId: string; displayName: string; rank: number; wins: number; losses: number; draws: number; points: number }>;
  schedule: Array<{ _id: string; team1Names: string[]; team2Names: string[]; team1Sets: number; team2Sets: number }>;
  membership: { userId: string } | null;
};

export default async function LeagueDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<Data>(`/api/v1/leagues/${id}`);
  logInfo("page.leagueDetail", { leagueId: id, standings: data.standings.length });
  const opponents = data.standings.filter((s) => s.userId !== user?._id);

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.league.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>{data.league.name}</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {data.league.seasonName} · {data.league.format} · {data.league.status}
        </p>
        {user && !data.membership && <JoinButton path={`/leagues/${id}/join`} />}
        {user && data.membership && <p style={{ color: "var(--text-muted)" }}>You are in this season</p>}

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <strong>Standings</strong>
          <table style={{ width: "100%", marginTop: 12, borderCollapse: "collapse" }}>
            <thead>
              <tr>
                <th align="left">#</th>
                <th align="left">Player</th>
                <th align="left">W-L-D</th>
                <th align="left">Pts</th>
              </tr>
            </thead>
            <tbody>
              {data.standings.map((s) => (
                <tr key={s.userId}>
                  <td>{s.rank}</td>
                  <td>{s.displayName}</td>
                  <td>{s.wins}-{s.losses}-{s.draws}</td>
                  <td>{s.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding: 20, marginTop: 16 }}>
          <strong>Results</strong>
          <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {data.schedule.map((r) => (
              <li key={r._id}>
                {r.team1Names.join("/")} {r.team1Sets}–{r.team2Sets} {r.team2Names.join("/")}
              </li>
            ))}
            {data.schedule.length === 0 && <li>No results yet</li>}
          </ul>
        </div>

        {user && data.membership && opponents.length > 0 && (
          <LeagueResultForm leagueId={id} opponents={opponents} />
        )}
        <p style={{ marginTop: 16 }}>
          <Link href="/compete/leagues" style={{ color: "var(--court-500)", fontWeight: 700 }}>All leagues</Link>
        </p>
      </main>
    </>
  );
}
