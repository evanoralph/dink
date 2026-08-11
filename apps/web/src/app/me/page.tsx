import Link from "next/link";
import { AppNav } from "@/components/AppNav";
import { getCurrentUser } from "@/lib/auth";
import { LogoutButton } from "@/components/LogoutButton";
import { apiFetch } from "@/lib/api";
import { logInfo } from "@/lib/logger";

export default async function MePage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>Please <Link href="/login">log in</Link>.</p>
        </main>
      </>
    );
  }
  let matches: unknown[] = [];
  try {
    matches = await apiFetch<unknown[]>("/api/v1/matches");
  } catch {
    matches = [];
  }
  logInfo("page.me", { userId: user._id, matches: matches.length });

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div className="label">Profile</div>
        <h1 className="display" style={{ margin: "12px 0 20px" }}>{user.profile.displayName}</h1>
        <div className="card" style={{ padding: 20, maxWidth: 520 }}>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>City:</strong> {user.profile.city || "—"}</p>
          <p><strong>Skill:</strong> {user.profile.skillLevel ?? "—"}</p>
          <p><strong>Roles:</strong> {(user.roles ?? []).join(", ") || "—"}</p>
          <p><strong>Match history:</strong> {matches.length}</p>
          <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
            <Link href="/onboarding" className="btn-secondary">Edit onboarding</Link>
            <LogoutButton />
          </div>
        </div>
      </main>
    </>
  );
}
