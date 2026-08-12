import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser, getPostAuthPath } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  const next =
    sp.next && sp.next.startsWith("/") && !sp.next.startsWith("//") ? sp.next : null;
  const user = await getCurrentUser();
  if (user) {
    const path = next || getPostAuthPath(user);
    logInfo("auth.login.redirect_existing", { userId: user._id, path, honoredNext: Boolean(next) });
    redirect(path);
  }

  return (
    <main className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Loading…</p>}>
          <AuthForm mode="login" />
        </Suspense>
        <p style={{ marginTop: 16, textAlign: "center", color: "var(--text-muted)" }}>
          New here?{" "}
          <Link
            href={next ? `/signup?next=${encodeURIComponent(next)}` : "/signup"}
            style={{ color: "var(--court-500)", fontWeight: 700 }}
          >
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
