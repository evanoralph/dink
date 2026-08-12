import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type League = { _id: string; name: string; city: string; seasonName: string; status: string };
type Ladder = { _id: string; name: string; city: string };
type Tournament = { _id: string; name: string; city: string; entryFee: number; format: string; status: string };
type BoardRow = { userId: string; displayName: string; rating: number; city?: string };

export default async function CompetePage() {
  const user = await getCurrentUser();
  let leagues: League[] = [];
  let ladders: Ladder[] = [];
  let tournaments: Tournament[] = [];
  let board: BoardRow[] = [];
  let rules: { start: number; k: number; formula: string; doubles: string; when: string } | null = null;
  try {
    [leagues, ladders, tournaments, board, rules] = await Promise.all([
      apiFetch<League[]>("/api/v1/leagues"),
      apiFetch<Ladder[]>("/api/v1/ladders"),
      apiFetch<Tournament[]>("/api/v1/tournaments"),
      apiFetch<BoardRow[]>("/api/v1/ratings/leaderboard"),
      apiFetch<{ start: number; k: number; formula: string; doubles: string; when: string }>(
        "/api/v1/ratings/rules",
      ),
    ]);
  } catch {
    /* API may be restarting */
  }
  logInfo("page.compete", {
    leagues: leagues.length,
    ladders: ladders.length,
    tournaments: tournaments.length,
  });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Competition</div>
        <h1 className="display" style={{ margin: "12px 0 12px" }}>Compete</h1>
        <p style={{ color: "var(--text-muted)", maxWidth: 640 }}>
          Leagues, ladders, and tournaments with a transparent Elo rating (start {rules?.start ?? 1000}, K=
          {rules?.k ?? 32}). Your rating: <strong>{user?.profile.rating ?? 1000}</strong>
        </p>
        <p style={{ fontSize: 13, color: "var(--text-muted)", maxWidth: 640 }}>
          {rules?.formula} {rules?.when}
        </p>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 28 }} className="play-grid">
          <section className="card" style={{ padding: 20 }}>
            <strong>Leagues</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {leagues.map((l) => (
                <li key={l._id}>
                  <Link href={`/compete/leagues/${l._id}`}>{l.name}</Link> · {l.city} · {l.seasonName}
                </li>
              ))}
              {leagues.length === 0 && <li>None yet</li>}
            </ul>
            <Link href="/compete/leagues" className="btn-secondary" style={{ marginTop: 12, display: "inline-flex" }}>
              All leagues
            </Link>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <strong>Ladders</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {ladders.map((l) => (
                <li key={l._id}>
                  <Link href={`/compete/ladders/${l._id}`}>{l.name}</Link> · {l.city}
                </li>
              ))}
              {ladders.length === 0 && <li>None yet</li>}
            </ul>
            <Link href="/compete/ladders" className="btn-secondary" style={{ marginTop: 12, display: "inline-flex" }}>
              All ladders
            </Link>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <strong>Tournaments</strong>
            <ul style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {tournaments.map((t) => (
                <li key={t._id}>
                  <Link href={`/compete/tournaments/${t._id}`}>{t.name}</Link> · {t.format} · ₱{t.entryFee} · {t.status}
                </li>
              ))}
              {tournaments.length === 0 && <li>None yet</li>}
            </ul>
            <Link href="/compete/tournaments" className="btn-secondary" style={{ marginTop: 12, display: "inline-flex" }}>
              All tournaments
            </Link>
          </section>
          <section className="card" style={{ padding: 20 }}>
            <strong>Rating leaderboard</strong>
            <ol style={{ margin: "12px 0 0", paddingLeft: 18 }}>
              {board.slice(0, 10).map((r) => (
                <li key={r.userId}>
                  {r.displayName} · {r.rating}
                  {r.city ? ` · ${r.city}` : ""}
                </li>
              ))}
              {board.length === 0 && <li>Play and confirm a match to appear here</li>}
            </ol>
          </section>
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
