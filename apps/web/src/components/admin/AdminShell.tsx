import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicUser } from "@/lib/types";

const NAV = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/venues", label: "Venues" },
  { href: "/admin/courts", label: "Courts" },
  { href: "/admin/bookings", label: "Bookings" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/games", label: "Games" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/disputes", label: "Disputes" },
  { href: "/admin/feature-flags", label: "Flags" },
  { href: "/admin/audit", label: "Audit" },
] as const;

export function AdminShell({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link href="/admin">
            Dink<span>.</span> Admin
          </Link>
        </div>
        <nav className="admin-nav">
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">{user.profile.displayName}</div>
          <Link href="/" className="admin-exit">
            Exit to site
          </Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">Operations console</div>
          <div className="admin-topbar-meta">{user.email || user._id}</div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
