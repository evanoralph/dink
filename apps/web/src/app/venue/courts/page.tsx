import { Suspense } from "react";
import { CreateCourtForm } from "@/components/CreateCourtForm";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { VenueCourtActiveToggle } from "@/components/venue/VenueActions";
import { apiFetch } from "@/lib/api";
import {
  buildQuery,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { Court, Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function VenueCourtsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const dash = await apiFetch<{ venues: Venue[] }>("/api/v1/venue/dashboard");
  const venue = dash.venues[0];
  const data = await apiFetch<AdminListResult<Court>>(
    `/api/v1/venue/courts${buildQuery(params)}`,
  );
  logInfo("page.venueCourts", {
    venueId: venue?._id,
    total: data.total,
    page: data.page,
  });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Courts</h1>
          {venue ? <p className="admin-muted">{venue.name}</p> : null}
        </div>
      </div>

      <ModuleTip>
        Toggle inactive courts to hide them from public booking. Add new courts with a clear name
        so players can pick the right surface.
      </ModuleTip>

      {venue ? <CreateCourtForm venueId={venue._id} /> : null}

      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Name", type: "text" },
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
          {
            key: "name",
            header: "Court",
            render: (c) => (
              <div>
                <strong>{c.name}</strong>
                <div className="admin-muted">{c.surface || "surface n/a"}</div>
              </div>
            ),
          },
          {
            key: "venue",
            header: "Venue",
            render: (c) => <span className="admin-mono">{c.venueId.slice(0, 10)}…</span>,
          },
          {
            key: "id",
            header: "ID",
            render: (c) => <span className="admin-mono">{c._id.slice(0, 10)}…</span>,
          },
          {
            key: "status",
            header: "Status",
            render: (c) => <StatusBadge status={c.active ? "active" : "inactive"} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (c) => <VenueCourtActiveToggle courtId={c._id} active={c.active} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
