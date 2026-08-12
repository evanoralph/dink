import { Suspense } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { ModerationResolve } from "@/components/admin/ModerationResolve";
import { apiFetch } from "@/lib/api";
import { buildQuery, type AdminListResult, type AdminSearchParams } from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type ReportRow = {
  _id: string;
  reporterUserId: string;
  targetType: string;
  targetId: string;
  reason: string;
  details?: string;
  status: string;
  createdAt: string;
  action?: string;
};

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<ReportRow>>(
    `/api/v1/admin/moderation${buildQuery(params)}`,
  );
  logInfo("page.adminModeration", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Moderation</h1>
        </div>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Reason", type: "text", placeholder: "Search reason" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "open", label: "Open" },
                { value: "actioned", label: "Actioned" },
                { value: "dismissed", label: "Dismissed" },
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
            key: "target",
            header: "Target",
            render: (r) => (
              <div>
                <strong>
                  {r.targetType} · {r.targetId.slice(0, 8)}…
                </strong>
                <div className="admin-muted">{r.reason}</div>
              </div>
            ),
          },
          { key: "status", header: "Status", render: (r) => r.status },
          {
            key: "created",
            header: "Opened",
            render: (r) => new Date(r.createdAt).toLocaleString(),
          },
          {
            key: "actions",
            header: "Resolve",
            render: (r) => <ModerationResolve report={r} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
