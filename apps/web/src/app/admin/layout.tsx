import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { getCurrentUser, hasRole } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["admin"])) {
    logInfo("admin.layout.denied", { hasUser: Boolean(user) });
    redirect("/login");
  }
  logInfo("admin.layout.ok", { userId: user._id });
  return <AdminShell user={user}>{children}</AdminShell>;
}
