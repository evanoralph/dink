import Link from "next/link";
import type { ReactNode } from "react";
import type { PublicUser } from "@/lib/types";

const BASE_NAV = [
  { href: "/venue", label: "Dashboard" },
  { href: "/venue/calendar", label: "Calendar" },
  { href: "/venue/courts", label: "Courts" },
  { href: "/venue/hours", label: "Hours" },
  { href: "/venue/bookings", label: "Bookings" },
  { href: "/venue/payments", label: "Payments" },
  { href: "/venue/settings", label: "Settings" },
  { href: "/venue/reports", label: "Reports" },
  { href: "/venue/packs", label: "Packs" },
] as const;

const STAFF_NAV = { href: "/venue/staff", label: "Staff" } as const;

export function VenueShell({
  user,
  canManageStaff,
  children,
}: {
  user: PublicUser;
  canManageStaff: boolean;
  children: ReactNode;
}) {
  // Insert Staff after Payments (index of payments is 5 with Hours added).
  const nav = canManageStaff
    ? [...BASE_NAV.slice(0, 6), STAFF_NAV, ...BASE_NAV.slice(6)]
    : [...BASE_NAV];

  return (
    <div className="admin-root">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <Link href="/venue">
            Dink<span>.</span> Venue
          </Link>
        </div>
        <nav className="admin-nav">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="admin-nav-link">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-sidebar-foot">
          <div className="admin-user">{user.profile.displayName}</div>
          <Link href="/list-your-venue" className="admin-exit">
            List another venue
          </Link>
          <Link href="/" className="admin-exit">
            Exit to site
          </Link>
        </div>
      </aside>
      <div className="admin-main">
        <header className="admin-topbar">
          <div className="admin-topbar-title">Venue operations</div>
          <div className="admin-topbar-meta">{user.email || user._id}</div>
        </header>
        <div className="admin-content">{children}</div>
      </div>
    </div>
  );
}
