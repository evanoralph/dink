import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { CopyShareLink } from "@/components/community/CopyShareLink";
import { apiFetch } from "@/lib/api";
import { logInfo } from "@/lib/logger";

type SharePayload = {
  match: { _id: string; status: string; completedAt?: string };
  sets: Array<{ setNumber: number; team1Score: number; team2Score: number }>;
  game: { startsAt: string; format: string; venueName?: string; city?: string } | null;
  team1: string[];
  team2: string[];
};

export default async function MatchSharePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await apiFetch<SharePayload>(`/api/v1/matches/${id}/share`);
  logInfo("page.matchShare", { matchId: id, status: data.match.status });
  const t1 = data.sets.reduce((s, x) => s + (x.team1Score > x.team2Score ? 1 : 0), 0);
  const t2 = data.sets.reduce((s, x) => s + (x.team2Score > x.team1Score ? 1 : 0), 0);

  return (
    <>
      <AppNav />
      <main className="app-shell" style={{ display: "grid", placeItems: "center", minHeight: "70vh" }}>
        <div className="card" style={{ padding: 32, maxWidth: 480, width: "100%" }}>
          <div className="label">Match card</div>
          <h1 className="display" style={{ margin: "12px 0 8px", fontSize: 40 }}>
            {t1}–{t2}
          </h1>
          <p style={{ color: "var(--text-muted)", margin: 0 }}>
            {data.game?.format || "doubles"}
            {data.game?.venueName ? ` · ${data.game.venueName}` : ""}
            {data.game?.city ? ` · ${data.game.city}` : ""}
          </p>
          {data.game?.startsAt && (
            <p style={{ color: "var(--text-muted)" }}>{new Date(data.game.startsAt).toLocaleString()}</p>
          )}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 20 }}>
            <div>
              <strong>Team 1</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {data.team1.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
            <div>
              <strong>Team 2</strong>
              <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                {data.team2.map((n) => (
                  <li key={n}>{n}</li>
                ))}
              </ul>
            </div>
          </div>
          <ul style={{ margin: "16px 0 0", paddingLeft: 18, color: "var(--text-muted)" }}>
            {data.sets.map((s) => (
              <li key={s.setNumber}>
                Set {s.setNumber}: {s.team1Score}–{s.team2Score}
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 16, textTransform: "capitalize" }}>Status: {data.match.status}</p>
          <CopyShareLink />
          <p style={{ marginTop: 16 }}>
            <Link href="/play" style={{ color: "var(--court-500)", fontWeight: 700 }}>
              Find a game
            </Link>
          </p>
        </div>
      </main>
    </>
  );
}
