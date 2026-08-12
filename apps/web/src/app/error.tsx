"use client";

import { useEffect } from "react";
import Link from "next/link";
import { logError } from "@/lib/logger";
import { captureException } from "@/lib/sentry";

/** P1-29: route-level error UI */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logError("web.error.boundary", { message: error.message, digest: error.digest });
    void captureException(error, { digest: error.digest, source: "error.tsx" });
  }, [error]);

  return (
    <main className="app-shell" style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}>
      <div className="card" style={{ padding: 28, maxWidth: 480, width: "100%" }}>
        <div className="label">Something went wrong</div>
        <h1 className="display" style={{ margin: "12px 0 16px", fontSize: 36 }}>
          We hit a snag
        </h1>
        <p style={{ color: "var(--text-muted)", lineHeight: 1.5 }}>
          Try again. If this keeps happening, head home and continue from there.
        </p>
        {error.digest && (
          <p style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--text-muted)" }}>
            Ref: {error.digest}
          </p>
        )}
        <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
          <button className="btn-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Home
          </Link>
        </div>
      </div>
    </main>
  );
}
