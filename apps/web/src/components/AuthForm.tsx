"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { track } from "@/lib/analytics";
import { logError, logInfo } from "@/lib/logger";
import { getPostAuthPath } from "@/lib/postAuthPath";
import type { PublicUser } from "@/lib/types";

type Mode = "login" | "signup";

function safeNextPath(raw: string | null): string | null {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    logInfo("auth.form.submit", { mode });
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "signup"
            ? {
                email,
                password,
                displayName,
                inviteCode: searchParams.get("invite") || undefined,
              }
            : { email, password },
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Authentication failed");
        logError("auth.form.fail", { mode, message: data.message });
        return;
      }
      logInfo("auth.form.ok", { mode, userId: data.user?._id });
      track(mode === "signup" ? "signup_completed" : "login_completed", { userId: data.user?._id });
      // Signup always starts onboarding; login uses ?next= (middleware) or role-aware home.
      const next = safeNextPath(searchParams.get("next"));
      const path =
        mode === "signup"
          ? "/onboarding"
          : next || (data.user ? getPostAuthPath(data.user as PublicUser) : "/play");
      logInfo("auth.form.redirect", { mode, path, userId: data.user?._id });
      router.push(path);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ padding: 28, maxWidth: 440, width: "100%" }}>
      <div className="label">{mode === "login" ? "Welcome back" : "Join Dink"}</div>
      <h1 className="display" style={{ margin: "12px 0 24px", fontSize: 40 }}>
        {mode === "login" ? "Log in" : "Sign up"}
      </h1>
      {mode === "signup" && (
        <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
          <span style={{ fontWeight: 600 }}>Display name</span>
          <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        </label>
      )}
      <label style={{ display: "grid", gap: 8, marginBottom: 14 }}>
        <span style={{ fontWeight: 600 }}>Email</span>
        <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </label>
      <label style={{ display: "grid", gap: 8, marginBottom: mode === "login" ? 10 : 18 }}>
        <span style={{ fontWeight: 600 }}>Password</span>
        <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
      </label>
      {mode === "login" && (
        <p style={{ marginBottom: 18, textAlign: "right" }}>
          <Link href="/forgot-password" style={{ color: "var(--court-500)", fontWeight: 600, fontSize: 14 }}>
            Forgot password?
          </Link>
        </p>
      )}
      {error && <p style={{ color: "var(--status-danger)", marginBottom: 12 }}>{error}</p>}
      <button className="btn-primary" type="submit" disabled={loading} style={{ width: "100%", justifyContent: "center" }}>
        {loading ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
