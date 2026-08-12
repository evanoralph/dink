import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { SimpleCreateForm } from "@/components/compete/SimpleCreateForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

type Row = { _id: string; name: string; city: string; entryFee: number; format: string; status: string; capacity: number };

export default async function TournamentsPage() {
  const user = await getCurrentUser();
  const rows = await apiFetch<Row[]>("/api/v1/tournaments").catch(() => []);
  logInfo("page.tournaments", { count: rows.length });
  const start = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16);
  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Compete</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Tournaments</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((t) => (
              <Link key={t._id} href={`/compete/tournaments/${t._id}`} className="card" style={{ padding: 20 }}>
                <strong>{t.name}</strong>
                <div style={{ color: "var(--text-muted)", marginTop: 6 }}>
                  {t.city} · {t.format} · ₱{t.entryFee} · {t.status} · cap {t.capacity}
                </div>
              </Link>
            ))}
            {rows.length === 0 && <p className="card" style={{ padding: 20 }}>No tournaments yet</p>}
          </div>
          {user ? (
            <SimpleCreateForm
              path="/tournaments"
              label="Create tournament"
              hrefFor={(id) => `/compete/tournaments/${id}`}
              extra={{ format: "single_elim" }}
              fields={[
                { name: "name", label: "Name" },
                { name: "city", label: "City", defaultValue: user.profile.city || "Angeles City" },
                { name: "startsAt", label: "Starts", type: "datetime-local", defaultValue: start },
                { name: "entryFee", label: "Entry fee (₱, 0 = free)", type: "number", defaultValue: "0" },
                { name: "capacity", label: "Capacity", type: "number", defaultValue: "8" },
              ]}
            />
          ) : (
            <p className="card" style={{ padding: 20 }}>
              <Link href="/login?next=/compete/tournaments">Log in</Link> to create a tournament.
            </p>
          )}
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
