"use client";

import { useRouter } from "next/navigation";
import { logInfo } from "@/lib/logger";

export function LogoutButton() {
  const router = useRouter();
  return (
    <button
      className="btn-primary"
      onClick={async () => {
        await fetch("/api/auth/logout", { method: "POST" });
        logInfo("auth.logout.client");
        router.push("/");
        router.refresh();
      }}
    >
      Log out
    </button>
  );
}
