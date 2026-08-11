import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser, getPostAuthPath } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) {
    const path = getPostAuthPath(user);
    logInfo("auth.login.redirect_existing", { userId: user._id, path });
    redirect(path);
  }

  return (
    <main className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <AuthForm mode="login" />
        <p style={{ marginTop: 16, textAlign: "center", color: "var(--text-muted)" }}>
          New here? <Link href="/signup" style={{ color: "var(--court-500)", fontWeight: 700 }}>Sign up</Link>
        </p>
      </div>
    </main>
  );
}
