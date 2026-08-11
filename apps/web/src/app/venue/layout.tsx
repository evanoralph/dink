import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { VenueShell } from "@/components/venue/VenueShell";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function VenueLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["venue_owner", "venue_staff", "admin"])) {
    logInfo("venue.layout.denied", { hasUser: Boolean(user) });
    redirect("/login");
  }
  const canManageStaff = hasRole(user, ["venue_owner", "admin"]);
  logInfo("venue.layout.ok", { userId: user._id, canManageStaff });
  return (
    <VenueShell user={user} canManageStaff={canManageStaff}>
      {children}
    </VenueShell>
  );
}
