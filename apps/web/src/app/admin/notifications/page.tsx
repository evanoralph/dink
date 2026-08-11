import { Suspense } from "react";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  buildQuery,
  formatDate,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type NotificationRow = {
  _id: string;
  userId: string;
  type: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
};

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<NotificationRow>>(
    `/api/v1/admin/notifications${buildQuery(params)}`,
  );
  logInfo("page.adminNotifications", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Notifications</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="notifications" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "userId", label: "User ID", type: "text" },
            { name: "type", label: "Type", type: "text" },
            {
              name: "read",
              label: "Read",
              type: "select",
              options: [
                { value: "true", label: "Read" },
                { value: "false", label: "Unread" },
              ],
            },
          ]}
        />
      </Suspense>
      <DataTable
        rows={data.items}
        total={data.total}
        page={data.page}
        pageSize={data.pageSize}
        columns={[
          {
            key: "title",
            header: "Notification",
            render: (n) => (
              <div>
                <strong>{n.title}</strong>
                <div className="admin-muted">{n.body}</div>
              </div>
            ),
          },
          {
            key: "user",
            header: "User",
            render: (n) => <span className="admin-mono">{n.userId.slice(0, 10)}…</span>,
          },
          { key: "type", header: "Type", render: (n) => n.type },
          {
            key: "read",
            header: "Read",
            render: (n) => <StatusBadge status={n.read ? "completed" : "pending"} />,
          },
          {
            key: "created",
            header: "Created",
            render: (n) => formatDate(n.createdAt),
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
