import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";

export async function AppNav() {
  const user = await getCurrentUser();
  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "var(--glass-light)",
        backdropFilter: "var(--blur-glass)",
        borderBottom: "1px solid var(--border-hairline)",
      }}
    >
      <div
        style={{
          maxWidth: "var(--max-content)",
          margin: "0 auto",
          padding: "0 var(--gutter-page)",
          height: 68,
          display: "flex",
          alignItems: "center",
          gap: 24,
        }}
      >
        <Link
          href="/"
          style={{
            font: "400 30px/1 var(--font-display)",
            textTransform: "uppercase",
            color: "var(--carbon-900)",
          }}
        >
          Dink<span style={{ color: "var(--volt-500)" }}>.</span>
        </Link>
        <nav style={{ display: "flex", gap: 18, flex: 1, flexWrap: "wrap" }}>
          <Link href="/courts" style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Courts
          </Link>
          <Link href="/play" style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Play
          </Link>
          <Link href="/bookings" style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
            Bookings
          </Link>
          {user?.roles?.some((r) => ["venue_owner", "venue_staff"].includes(r)) && (
            <Link href="/venue" style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Venue
            </Link>
          )}
          {user?.roles?.includes("admin") && (
            <Link href="/admin" style={{ font: "700 var(--text-sm)/1 var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Admin
            </Link>
          )}
        </nav>
        {user ? (
          <Link href="/me" className="btn-primary" style={{ height: "var(--control-h-sm)", padding: "0 16px" }}>
            {user.profile.displayName}
          </Link>
        ) : (
          <Link href="/login" className="btn-primary" style={{ height: "var(--control-h-sm)", padding: "0 16px" }}>
            Log in
          </Link>
        )}
      </div>
    </header>
  );
}
