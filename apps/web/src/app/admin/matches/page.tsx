import { Suspense } from "react";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  MATCH_STATUSES,
  buildQuery,
  formatDate,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type MatchRow = {
  _id: string;
  gameId: string;
  status: string;
  team1UserIds: string[];
  team2UserIds: string[];
  createdAt: string;
  completedAt?: string;
};

export default async function AdminMatchesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<MatchRow>>(
    `/api/v1/admin/matches${buildQuery(params)}`,
  );
  logInfo("page.adminMatches", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Matches</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="matches" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: MATCH_STATUSES.map((s) => ({ value: s, label: s })),
            },
            { name: "gameId", label: "Game ID", type: "text" },
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
            key: "id",
            header: "Match",
            render: (m) => <span className="admin-mono">{m._id.slice(0, 10)}…</span>,
          },
          {
            key: "game",
            header: "Game",
            render: (m) => <span className="admin-mono">{m.gameId.slice(0, 10)}…</span>,
          },
          {
            key: "teams",
            header: "Teams",
            render: (m) => (
              <span className="admin-muted">
                {m.team1UserIds?.length || 0} vs {m.team2UserIds?.length || 0}
              </span>
            ),
          },
          {
            key: "created",
            header: "Created",
            render: (m) => formatDate(m.createdAt),
          },
          {
            key: "status",
            header: "Status",
            render: (m) => <StatusBadge status={m.status} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
