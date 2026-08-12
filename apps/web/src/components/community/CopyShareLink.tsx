"use client";

import { useState } from "react";
import { logInfo } from "@/lib/logger";

export function CopyShareLink() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const href = typeof window !== "undefined" ? window.location.href : "";
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      logInfo("match.share.copied");
    } catch {
      setCopied(false);
    }
  }

  return (
    <button className="btn-primary" type="button" onClick={copy} style={{ marginTop: 16 }}>
      {copied ? "Copied" : "Copy share link"}
    </button>
  );
}
