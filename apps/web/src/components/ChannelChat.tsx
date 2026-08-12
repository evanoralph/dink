"use client";

import { useEffect, useRef, useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

type Msg = {
  _id: string;
  userId: string;
  body: string;
  createdAt: string;
  displayName?: string;
};

export function ChannelChat({
  channelType,
  channelId,
}: {
  channelType: "game" | "group";
  channelId: string;
}) {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const rows = await clientApiFetch<Msg[]>(
        `/chat?channelType=${channelType}&channelId=${encodeURIComponent(channelId)}`,
      );
      setMessages(rows);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Chat unavailable");
    }
  }

  useEffect(() => {
    void load();
    const t = setInterval(() => void load(), 4000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelType, channelId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    try {
      const msg = await clientApiFetch<Msg>("/chat", {
        method: "POST",
        body: { channelType, channelId, body },
      });
      setText("");
      setMessages((prev) => [...prev, msg]);
      logInfo("chat.posted", { channelType, channelId });
    } catch (err) {
      logError("chat.post.fail", { message: err instanceof Error ? err.message : "unknown" });
      setError(err instanceof Error ? err.message : "Send failed");
    }
  }

  return (
    <div className="card" style={{ padding: 20, marginTop: 16 }}>
      <strong>Chat</strong>
      <p style={{ margin: "4px 0 12px", color: "var(--text-muted)", fontSize: 13 }}>
        Near-realtime · refreshes every 4s
      </p>
      <div style={{ maxHeight: 240, overflowY: "auto", display: "grid", gap: 8 }}>
        {messages.map((m) => (
          <div key={m._id} style={{ fontSize: 14 }}>
            <strong>{m.displayName || "Player"}</strong>{" "}
            <span style={{ color: "var(--text-muted)" }}>
              {new Date(m.createdAt).toLocaleTimeString()}
            </span>
            <div>{m.body}</div>
          </div>
        ))}
        {messages.length === 0 && <p style={{ color: "var(--text-muted)", margin: 0 }}>No messages yet</p>}
        <div ref={bottom} />
      </div>
      {error && <p style={{ color: "var(--status-danger)", fontSize: 13 }}>{error}</p>}
      <form onSubmit={send} style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <input
          className="input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Message…"
          maxLength={500}
        />
        <button className="btn-primary" type="submit">
          Send
        </button>
      </form>
    </div>
  );
}
