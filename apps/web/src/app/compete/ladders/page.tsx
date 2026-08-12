import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { SimpleCreateForm } from "@/components/compete/SimpleCreateForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type Ladder = { _id: string; name: string; city: string };

export default async function LaddersPage() {
  const user = await getCurrentUser();
  const ladders = await apiFetch<Ladder[]>("/api/v1/ladders").catch(() => []);
  logInfo("page.ladders", { count: ladders.length });
  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Compete</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Ladders</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {ladders.map((l) => (
              <Link key={l._id} href={`/compete/ladders/${l._id}`} className="card" style={{ padding: 20 }}>
                <strong>{l.name}</strong>
                <div style={{ color: "var(--text-muted)", marginTop: 6 }}>{l.city}</div>
              </Link>
            ))}
            {ladders.length === 0 && <p className="card" style={{ padding: 20 }}>No ladders yet</p>}
          </div>
          {user ? (
            <SimpleCreateForm
              path="/ladders"
              label="Start a ladder"
              hrefFor={(id) => `/compete/ladders/${id}`}
              fields={[
                { name: "name", label: "Name" },
                { name: "city", label: "City", defaultValue: user.profile.city || "Angeles City" },
              ]}
            />
          ) : (
            <p className="card" style={{ padding: 20 }}>
              <Link href="/login?next=/compete/ladders">Log in</Link> to create a ladder.
            </p>
          )}
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
