import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dink — Find a court. Find your people.",
  // P0-02: metadata must match shipped features (no GCash/chat/coaching claims).
  description:
    "Browse pickleball courts, book a slot, join open games, and log scores. Pilot for players in the Philippines.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Anton&family=Archivo:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=JetBrains+Mono:wght@400;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
