import { Suspense } from "react";
import { CourtActiveToggle } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import { buildQuery, type AdminListResult, type AdminSearchParams } from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type AdminCourt = {
  _id: string;
  venueId: string;
  name: string;
  surface?: string;
  active: boolean;
  venueName?: string;
  venueCity?: string;
};

export default async function AdminCourtsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<AdminCourt>>(
    `/api/v1/admin/courts${buildQuery(params)}`,
  );
  logInfo("page.adminCourts", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Courts</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="courts" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Search", type: "text", placeholder: "Court name" },
            { name: "venueId", label: "Venue ID", type: "text" },
            {
              name: "active",
              label: "Active",
              type: "select",
              options: [
                { value: "true", label: "Active" },
                { value: "false", label: "Inactive" },
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
          { key: "name", header: "Court", render: (c) => <strong>{c.name}</strong> },
          {
            key: "venue",
            header: "Venue",
            render: (c) => (
              <div>
                {c.venueName || c.venueId}
                <div className="admin-muted">{c.venueCity || ""}</div>
              </div>
            ),
          },
          { key: "surface", header: "Surface", render: (c) => c.surface || "—" },
          {
            key: "status",
            header: "Status",
            render: (c) => <StatusBadge status={c.active ? "active" : "inactive"} />,
          },
          {
            key: "actions",
            header: "Toggle",
            render: (c) => <CourtActiveToggle courtId={c._id} active={c.active} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
