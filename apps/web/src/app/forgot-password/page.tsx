"use client";

import Link from "next/link";
import { useState } from "react";
import { logError, logInfo } from "@/lib/logger";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    logInfo("auth.forgot.submit");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Could not start reset");
        logError("auth.forgot.fail", { message: data.message });
        return;
      }
      setDone(true);
      logInfo("auth.forgot.ok");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form onSubmit={onSubmit} className="card" style={{ padding: 28, maxWidth: 440, width: "100%" }}>
        <div className="label">Account recovery</div>
        <h1 className="display" style={{ margin: "12px 0 24px", fontSize: 36 }}>
          Forgot password
        </h1>
        {done ? (
          <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
            If that email is registered, we sent a reset link. Check your inbox (and API logs in
            local/dev when MAIL_URL is unset).
          </p>
        ) : (
          <>
            <label style={{ display: "grid", gap: 8, marginBottom: 18 }}>
              <span style={{ fontWeight: 600 }}>Email</span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>
            {error && <p style={{ color: "var(--status-danger)", marginBottom: 12 }}>{error}</p>}
            <button
              className="btn-primary"
              type="submit"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center" }}
            >
              {loading ? "Sending…" : "Send reset link"}
            </button>
          </>
        )}
        <p style={{ marginTop: 16, textAlign: "center", color: "var(--text-muted)" }}>
          <Link href="/login" style={{ color: "var(--court-500)", fontWeight: 700 }}>
            Back to log in
          </Link>
        </p>
      </form>
    </main>
  );
}
