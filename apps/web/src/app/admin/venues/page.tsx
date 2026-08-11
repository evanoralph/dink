import Link from "next/link";
import { Suspense } from "react";
import { VenueStatusButtons } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  VENUE_STATUSES,
  buildQuery,
  formatMoney,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function AdminVenuesPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<Venue>>(
    `/api/v1/admin/venues${buildQuery(params)}`,
  );
  logInfo("page.adminVenues", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Venues</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="venues" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Search", type: "text", placeholder: "Name or city" },
            { name: "city", label: "City", type: "text" },
            {
              name: "status",
              label: "Status",
              type: "select",
              options: VENUE_STATUSES.map((s) => ({ value: s, label: s })),
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
            key: "name",
            header: "Venue",
            render: (v) => (
              <div>
                <strong>{v.name}</strong>
                <div className="admin-muted">{v.address || "No address"}</div>
              </div>
            ),
          },
          { key: "city", header: "City", render: (v) => v.city },
          {
            key: "courts",
            header: "Courts",
            render: (v) => (
              <Link href={`/admin/courts?venueId=${v._id}`} className="admin-mono">
                {v.courtCount} courts
              </Link>
            ),
          },
          {
            key: "price",
            header: "From",
            render: (v) => (v.priceFrom != null ? formatMoney(v.priceFrom, v.currency) : "—"),
          },
          {
            key: "status",
            header: "Status",
            render: (v) => <StatusBadge status={v.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (v) => <VenueStatusButtons venueId={v._id} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
