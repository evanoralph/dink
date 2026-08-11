import { AppNav } from "@/components/AppNav";
import { JoinGameButton } from "@/components/GameActions";
import { MatchResultForm } from "@/components/MatchResultForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Game } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function GameDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  const data = await apiFetch<{
    game: Game;
    players: Array<{ userId: string; status: string }>;
  }>(`/api/v1/games/${id}`);
  logInfo("page.gameDetail", { gameId: id, players: data.players.length });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">{data.game.format}</div>
        <h1 className="display" style={{ margin: "12px 0 8px" }}>Game detail</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {new Date(data.game.startsAt).toLocaleString()} · skill {data.game.skillMin}–{data.game.skillMax}
        </p>
        <div className="card" style={{ padding: 20, marginTop: 20 }}>
          <div>Players: {data.game.playerCount}/{data.game.capacity}</div>
          <div style={{ marginTop: 8 }}>Status: {data.game.status}</div>
          <div style={{ marginTop: 8 }}>Invite: {data.game.inviteCode}</div>
          {user && data.game.status === "open" && (
            <div style={{ marginTop: 16 }}>
              <JoinGameButton gameId={id} />
            </div>
          )}
        </div>
        {user && (
          <MatchResultForm
            gameId={id}
            playerIds={data.players.map((p) => p.userId)}
          />
        )}
      </main>
    </>
  );
}
