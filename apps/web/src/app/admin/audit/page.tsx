import { Suspense } from "react";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { apiFetch } from "@/lib/api";
import {
  buildQuery,
  formatDate,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type AuditRow = {
  _id: string;
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  createdAt: string;
};

export default async function AdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<AuditRow>>(
    `/api/v1/admin/audit${buildQuery(params)}`,
  );
  logInfo("page.adminAudit", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Audit log</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="audit" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "actorUserId", label: "Actor", type: "text" },
            { name: "action", label: "Action", type: "text", placeholder: "venues.setStatus" },
            { name: "from", label: "From", type: "date" },
            { name: "to", label: "To", type: "date" },
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
            key: "when",
            header: "When",
            render: (a) => formatDate(a.createdAt),
          },
          {
            key: "actor",
            header: "Actor",
            render: (a) => <span className="admin-mono">{a.actorUserId.slice(0, 10)}…</span>,
          },
          { key: "action", header: "Action", render: (a) => a.action },
          {
            key: "entity",
            header: "Entity",
            render: (a) => (
              <span className="admin-mono">
                {a.entityType}:{a.entityId.slice(0, 10)}…
              </span>
            ),
          },
          {
            key: "diff",
            header: "Change",
            render: (a) => (
              <span className="admin-muted">
                {JSON.stringify(a.before || {})} → {JSON.stringify(a.after || {})}
              </span>
            ),
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
