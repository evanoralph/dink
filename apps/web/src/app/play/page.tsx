import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { CreateGameForm } from "@/components/GameActions";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Game, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function PlayPage() {
  const user = await getCurrentUser();
  let games: Game[] = [];
  let venues: Venue[] = [];
  try {
    games = await apiFetch<Game[]>("/api/v1/games");
    venues = await apiFetch<Venue[]>("/api/v1/venues");
    logInfo("page.play", { games: games.length });
  } catch {
    // API may be down during first boot
  }

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Matchmaking</div>
        <h1 className="display" style={{ margin: "12px 0 28px" }}>Open games</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {games.map((game) => (
              <Link key={game._id} href={`/games/${game._id}`} className="card" style={{ padding: 20 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong>{new Date(game.startsAt).toLocaleString()}</strong>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--kitchen-500)" }}>
                    {game.capacity - game.playerCount} spots
                  </span>
                </div>
                <div style={{ marginTop: 8, color: "var(--text-muted)" }}>
                  {game.format} · {game.skillMin}–{game.skillMax} · {game.playerCount}/{game.capacity}
                </div>
              </Link>
            ))}
            {games.length === 0 && <p className="card" style={{ padding: 20 }}>No open games yet. Create one.</p>}
          </div>
          {user ? <CreateGameForm venues={venues} /> : (
            <div className="card" style={{ padding: 20 }}>
              <p>Log in to create or join games.</p>
              <Link href="/login" className="btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>Log in</Link>
            </div>
          )}
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
