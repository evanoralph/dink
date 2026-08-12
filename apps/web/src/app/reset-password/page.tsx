"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { logError, logInfo } from "@/lib/logger";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const emailFromLink = params.get("email") || "";
  const [email, setEmail] = useState(emailFromLink);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    logInfo("auth.reset.submit");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Reset failed");
        logError("auth.reset.fail", { message: data.message });
        return;
      }
      logInfo("auth.reset.ok");
      router.push("/login");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <p style={{ color: "var(--status-danger)" }}>
        Missing reset token. Request a new link from{" "}
        <Link href="/forgot-password" style={{ color: "var(--court-500)", fontWeight: 700 }}>
          forgot password
        </Link>
        .
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 28, maxWidth: 440, width: "100%" }}>
      <div className="label">Account recovery</div>
      <h1 className="display" style={{ margin: "12px 0 24px", fontSize: 36 }}>
        Set new password
      </h1>
      <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 600 }}>Email</span>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
      </label>
      <label style={{ display: "grid", gap: 8, marginBottom: 18 }}>
        <span style={{ fontWeight: 600 }}>New password</span>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
      </label>
      {error && <p style={{ color: "var(--status-danger)", marginBottom: 12 }}>{error}</p>}
      <button
        className="btn-primary"
        type="submit"
        disabled={loading}
        style={{ width: "100%", justifyContent: "center" }}
      >
        {loading ? "Saving…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Loading…</p>}>
        <ResetPasswordForm />
      </Suspense>
    </main>
  );
}
