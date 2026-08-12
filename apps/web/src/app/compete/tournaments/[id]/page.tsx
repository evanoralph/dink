import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { TournamentActions } from "@/components/compete/TournamentActions";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type Data = {
  tournament: {
    _id: string;
    name: string;
    city: string;
    format: string;
    status: string;
    entryFee: number;
    capacity: number;
    startsAt: string;
    creatorUserId: string;
  };
  entries: Array<{ userId: string; displayName: string; seed: number; paymentStatus: string }>;
  matches: Array<{
    _id: string;
    round: number;
    slot: number;
    status: string;
    player1Id?: string;
    player2Id?: string;
    winnerId?: string;
    player1Name: string;
    player2Name: string;
    winnerName?: string | null;
  }>;
  membership: { userId: string; paymentStatus: string } | null;
};

export default async function TournamentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<Data>(`/api/v1/tournaments/${id}`);
  logInfo("page.tournamentDetail", { tournamentId: id, entries: data.entries.length });
  const rounds = [...new Set(data.matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.tournament.city}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>{data.tournament.name}</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {data.tournament.format} · ₱{data.tournament.entryFee} · {data.tournament.status} ·{" "}
          {data.entries.length}/{data.tournament.capacity} · {new Date(data.tournament.startsAt).toLocaleString()}
        </p>
        {user && (
          <TournamentActions
            tournamentId={id}
            status={data.tournament.status}
            isOrganizer={data.tournament.creatorUserId === user._id}
            registered={Boolean(data.membership)}
            matches={data.matches}
            userId={user._id}
          />
        )}

        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <strong>Registered</strong>
          <ol style={{ margin: "12px 0 0", paddingLeft: 18 }}>
            {data.entries.map((e) => (
              <li key={e.userId}>
                {e.displayName} · {e.paymentStatus}
              </li>
            ))}
            {data.entries.length === 0 && <li>No one yet</li>}
          </ol>
        </div>

        {rounds.map((round) => (
          <div key={round} className="card" style={{ padding: 20, marginTop: 16 }}>
            <strong>{data.tournament.format === "round_robin" ? "Round robin" : `Round ${round}`}</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {data.matches
                .filter((m) => m.round === round)
                .map((m) => (
                  <li key={m._id}>
                    {m.player1Name} vs {m.player2Name}
                    {m.winnerName ? ` → ${m.winnerName}` : ` · ${m.status}`}
                  </li>
                ))}
            </ul>
          </div>
        ))}
        <p style={{ marginTop: 16 }}>
          <Link href="/compete/tournaments" style={{ color: "var(--court-500)", fontWeight: 700 }}>
            All tournaments
          </Link>
        </p>
      </main>
    </>
  );
}
