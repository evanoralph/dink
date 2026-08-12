import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { CreateGroupForm } from "@/components/community/CreateGroupForm";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import type { Group } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function GroupsPage() {
  const user = await getCurrentUser();
  let groups: Group[] = [];
  try {
    groups = await apiFetch<Group[]>("/api/v1/groups");
  } catch {
    groups = [];
  }
  logInfo("page.groups", { count: groups.length, userId: user?._id });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Community</div>
        <h1 className="display" style={{ margin: "12px 0 24px" }}>Groups</h1>
        <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 24 }} className="play-grid">
          <div style={{ display: "grid", gap: 12 }}>
            {groups.map((g) => (
              <Link key={g._id} href={`/groups/${g._id}`} className="card" style={{ padding: 20 }}>
                <strong>{g.name}</strong>
                <div style={{ marginTop: 6, color: "var(--text-muted)" }}>
                  {g.city} · {g.memberCount} members
                </div>
                {g.description && <p style={{ margin: "8px 0 0" }}>{g.description}</p>}
              </Link>
            ))}
            {groups.length === 0 && <p className="card" style={{ padding: 20 }}>No groups yet. Start one.</p>}
          </div>
          {user ? (
            <CreateGroupForm defaultCity={user.profile.city || "Angeles City"} />
          ) : (
            <div className="card" style={{ padding: 20 }}>
              <p>Log in to create or join a group.</p>
              <Link href="/login?next=/groups" className="btn-primary" style={{ marginTop: 12, display: "inline-flex" }}>
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
