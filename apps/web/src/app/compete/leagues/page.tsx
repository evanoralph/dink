import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { SimpleCreateForm } from "@/components/compete/SimpleCreateForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type League = { _id: string; name: string; city: string; seasonName: string; status: string };

export default async function LeaguesPage() {
  const user = await getCurrentUser();
  const leagues = await apiFetch<League[]>("/api/v1/leagues").catch(() => []);
  logInfo("page.leagues", { count: leagues.length });
  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Compete</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Leagues</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {leagues.map((l) => (
              <Link key={l._id} href={`/compete/leagues/${l._id}`} className="card" style={{ padding: 20 }}>
                <strong>{l.name}</strong>
                <div style={{ color: "var(--text-muted)", marginTop: 6 }}>
                  {l.city} · {l.seasonName} · {l.status}
                </div>
              </Link>
            ))}
            {leagues.length === 0 && <p className="card" style={{ padding: 20 }}>No leagues yet</p>}
          </div>
          {user ? (
            <SimpleCreateForm
              path="/leagues"
              label="Start a league"
              hrefFor={(id) => `/compete/leagues/${id}`}
              fields={[
                { name: "name", label: "Name" },
                { name: "city", label: "City", defaultValue: user.profile.city || "Angeles City" },
                { name: "seasonName", label: "Season", defaultValue: "Season 1" },
              ]}
            />
          ) : (
            <p className="card" style={{ padding: 20 }}>
              <Link href="/login?next=/compete/leagues">Log in</Link> to create a league.
            </p>
          )}
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
