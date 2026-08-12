import { Suspense } from "react";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { DisputeResolve } from "@/components/admin/DisputeResolve";
import { apiFetch } from "@/lib/api";
import { buildQuery, type AdminListResult, type AdminSearchParams } from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type Row = {
  _id: string;
  matchId: string;
  reporterUserId: string;
  reason: string;
  status: string;
  createdAt: string;
  note?: string;
};

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<Row>>(`/api/v1/admin/disputes${buildQuery(params)}`);
  logInfo("page.adminDisputes", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Score disputes</h1>
        </div>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: [
                { value: "open", label: "Open" },
                { value: "dismissed", label: "Dismissed" },
                { value: "voided", label: "Voided" },
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
            key: "match",
            header: "Match",
            render: (r) => <span className="admin-mono">{r.matchId.slice(0, 10)}…</span>,
          },
          { key: "reason", header: "Reason", render: (r) => r.reason },
          { key: "status", header: "Status", render: (r) => r.status },
          {
            key: "act",
            header: "Action",
            render: (r) => (r.status === "open" ? <DisputeResolve disputeId={r._id} /> : r.note || "—"),
          },
        ]}
      />
      <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
    </>
  );
}
