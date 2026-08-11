import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { getCurrentUser, getPostAuthPath } from "@/lib/auth";
import { logInfo } from "@/lib/logger";

export default async function SignupPage() {
  const user = await getCurrentUser();
  if (user) {
    const path = getPostAuthPath(user);
    logInfo("auth.signup.redirect_existing", { userId: user._id, path });
    redirect(path);
  }

  return (
    <main className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <div>
        <AuthForm mode="signup" />
        <p style={{ marginTop: 16, textAlign: "center", color: "var(--text-muted)" }}>
          Already have an account? <Link href="/login" style={{ color: "var(--court-500)", fontWeight: 700 }}>Log in</Link>
        </p>
      </div>
    </main>
  );
}
