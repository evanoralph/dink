import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { BecomeCoachForm } from "@/components/community/BecomeCoachForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { CoachProfile } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string }>;
}) {
  const sp = await searchParams;
  const user = await getCurrentUser();
  const city = sp.city || user?.profile.city || "";
  let coaches: CoachProfile[] = [];
  try {
    const q = city ? `?city=${encodeURIComponent(city)}` : "";
    coaches = await apiFetch<CoachProfile[]>(`/api/v1/coaches${q}`);
  } catch {
    coaches = [];
  }
  logInfo("page.coaches", { count: coaches.length, city });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Coaching</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Find a coach</h1>
        <form method="get" style={{ display: "flex", gap: 10, marginBottom: 24, maxWidth: 480 }}>
          <input className="input" name="city" defaultValue={city} placeholder="City" />
          <button className="btn-secondary" type="submit">Search</button>
        </form>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {coaches.map((c) => (
              <Link key={c.userId} href={`/coaches/${c.userId}`} className="card" style={{ padding: 20 }}>
                <strong>{c.displayName || "Coach"}</strong>
                <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
                  {c.city} · ₱{c.hourlyRate}/hr
                  {c.ratingCount ? ` · ${c.ratingAvg}★ (${c.ratingCount})` : ""}
                </div>
                {c.bio && <p style={{ margin: "8px 0 0" }}>{c.bio}</p>}
              </Link>
            ))}
            {coaches.length === 0 && (
              <p className="card" style={{ padding: 20 }}>
                No coaches in {city || "this city"} yet.
              </p>
            )}
          </div>
          {user ? (
            <BecomeCoachForm defaultCity={user.profile.city || "Angeles City"} />
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <p>Log in to request a session or list yourself as a coach.</p>
              <Link href="/login?next=/coaches" className="btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
                Log in
              </Link>
            </div>
          )}
        </div>
        <style>{`@media (max-width: 900px){ .play-grid{ grid-template-columns: 1fr !important; } }`}</style>
      </main>
    </>
  );
}
