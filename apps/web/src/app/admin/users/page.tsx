import { Suspense } from "react";
import { UserRolesEditor } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { apiFetch } from "@/lib/api";
import {
  ALL_ROLES,
  buildQuery,
  sp,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import type { PublicUser } from "@/lib/types";
import { logInfo } from "@/lib/logger";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<PublicUser>>(
    `/api/v1/admin/users${buildQuery(params)}`,
  );
  logInfo("page.adminUsers", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Users</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="users" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            { name: "q", label: "Search", type: "text", placeholder: "Name or email" },
            { name: "city", label: "City", type: "text", placeholder: "City" },
            {
              name: "role",
              label: "Role",
              type: "select",
              options: ALL_ROLES.map((r) => ({ value: r, label: r })),
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
            header: "User",
            render: (u) => (
              <div>
                <strong>{u.profile.displayName}</strong>
                <div className="admin-muted">{u.email || u._id}</div>
              </div>
            ),
          },
          {
            key: "city",
            header: "City",
            render: (u) => u.profile.city || "—",
          },
          {
            key: "roles",
            header: "Roles",
            render: (u) => <UserRolesEditor userId={u._id} roles={u.roles} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
      {sp(params, "role") ? <p className="admin-muted">Filtered by role: {sp(params, "role")}</p> : null}
    </>
  );
}
