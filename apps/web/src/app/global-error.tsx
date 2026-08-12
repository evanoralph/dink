"use client";

import { useEffect } from "react";

/** P1-29: root layout failure UI (must define its own html/body). */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(
      JSON.stringify({
        ts: new Date().toISOString(),
        level: "error",
        event: "web.global_error",
        message: error.message,
        digest: error.digest,
      }),
    );
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0f1410",
          color: "#f4f7f2",
        }}
      >
        <div style={{ maxWidth: 420, padding: 24, textAlign: "center" }}>
          <h1 style={{ fontSize: 28, marginBottom: 12 }}>Dink is temporarily unavailable</h1>
          <p style={{ opacity: 0.8, lineHeight: 1.5 }}>
            A critical error occurred. Please refresh the page.
          </p>
          {error.digest && (
            <p style={{ fontSize: 12, opacity: 0.6, fontFamily: "monospace" }}>Ref: {error.digest}</p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: 20,
              padding: "10px 20px",
              fontWeight: 700,
              cursor: "pointer",
              border: "2px solid #f4f7f2",
              background: "transparent",
              color: "#f4f7f2",
            }}
          >
            Refresh
          </button>
        </div>
      </body>
    </html>
  );
}
