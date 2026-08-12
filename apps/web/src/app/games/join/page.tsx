import { Suspense } from "react";
import { AppNav } from "@/components/AppNav";
import { JoinByCodeForm } from "@/components/JoinByCodeForm";

/** P1-23: deep link `/games/join?code=` — server shell + client form. */
export default function JoinGamePage() {
  return (
    <>
      <AppNav />
      <main
        className="app-shell"
        style={{ minHeight: "70vh", display: "grid", placeItems: "center" }}
      >
        <Suspense fallback={<p style={{ color: "var(--text-muted)" }}>Loading…</p>}>
          <JoinByCodeForm />
        </Suspense>
      </main>
    </>
  );
}
