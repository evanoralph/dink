import { AppNav } from "@/components/AppNav";
import { MarkNotificationsRead } from "@/components/MarkNotificationsRead";
import { apiFetch } from "@/lib/api";
import { getCurrentUser } from "@/lib/auth";
import Link from "next/link";
import { logInfo } from "@/lib/logger";

type Notification = {
  _id: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
  emailStatus?: string;
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <>
        <AppNav />
        <main className="app-shell">
          <p>
            Please <Link href="/login">log in</Link> to see notifications.
          </p>
        </main>
      </>
    );
  }

  let items: Notification[] = [];
  let unreadCount = 0;
  try {
    const data = await apiFetch<{ items: Notification[]; unreadCount: number }>(
      "/api/v1/notifications",
    );
    items = data.items;
    unreadCount = data.unreadCount;
    logInfo("page.notifications", { count: items.length, unreadCount });
  } catch {
    items = [];
  }

  return (
    <>
      <AppNav />
      <main className="app-shell">
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "end" }}>
          <div>
            <div className="label">Inbox</div>
            <h1 className="display" style={{ margin: "12px 0 0" }}>
              Notifications
            </h1>
          </div>
          <MarkNotificationsRead unreadCount={unreadCount} />
        </div>
        <p style={{ color: "var(--text-muted)", margin: "12px 0 28px" }}>
          {unreadCount} unread · booking and game updates land here (email when API `MAIL_URL` is set)
        </p>
        <div style={{ display: "grid", gap: 10 }}>
          {items.map((n) => (
            <div
              key={n._id}
              className="card"
              style={{
                padding: 16,
                opacity: n.read ? 0.72 : 1,
                borderLeft: n.read ? undefined : "3px solid var(--volt-400)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <strong>{n.title}</strong>
                <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  {new Date(n.createdAt).toLocaleString()}
                </span>
              </div>
              <p style={{ margin: "8px 0 0", color: "var(--text-muted)" }}>{n.body}</p>
              <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-muted)" }}>
                {n.type}
                {n.emailStatus ? ` · email ${n.emailStatus}` : ""}
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="card" style={{ padding: 18 }}>
              No notifications yet. Book a court or join a game to get updates.
            </p>
          )}
        </div>
      </main>
    </>
  );
}
