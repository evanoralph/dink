import { Suspense } from "react";
import { GameStatusActions } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  GAME_STATUSES,
  buildQuery,
  formatDate,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { Game } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function AdminGamesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<Game>>(
    `/api/v1/admin/games${buildQuery(params)}`,
  );
  logInfo("page.adminGames", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Games</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="games" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: GAME_STATUSES.map((s) => ({ value: s, label: s })),
            },
            { name: "venueId", label: "Venue ID", type: "text" },
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
            header: "Game",
            render: (g) => <span className="admin-mono">{g._id.slice(0, 10)}…</span>,
          },
          {
            key: "when",
            header: "Starts",
            render: (g) => formatDate(g.startsAt),
          },
          {
            key: "format",
            header: "Format",
            render: (g) => `${g.format} · ${g.playerCount}/${g.capacity}`,
          },
          {
            key: "skill",
            header: "Skill",
            render: (g) => `${g.skillMin}–${g.skillMax}`,
          },
          {
            key: "code",
            header: "Invite",
            render: (g) => <span className="admin-mono">{g.inviteCode}</span>,
          },
          {
            key: "status",
            header: "Status",
            render: (g) => <StatusBadge status={g.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (g) => <GameStatusActions gameId={g._id} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
