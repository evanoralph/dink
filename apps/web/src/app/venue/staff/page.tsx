import { redirect } from "next/navigation";
import { AddStaffForm } from "@/components/AddStaffForm";
import { DataTable } from "@/components/admin/DataTable";
import { ModuleTip } from "@/components/venue/ModuleTip";
import { VenueStaffRemoveButton } from "@/components/venue/VenueActions";
import { apiFetch } from "@/lib/api";
import { getCurrentUser, hasRole } from "@/lib/auth";
import type { Venue } from "@/lib/types";
import { logInfo } from "@/lib/logger";

type StaffRow = {
  _id: string;
  venueId: string;
  userId: string;
  role: string;
  email: string;
  displayName: string;
};

export default async function VenueStaffPage() {
  const user = await getCurrentUser();
  if (!user || !hasRole(user, ["venue_owner", "admin"])) {
    logInfo("page.venueStaff.denied", { hasUser: Boolean(user) });
    redirect("/venue");
  }

  const dash = await apiFetch<{ venues: Venue[] }>("/api/v1/venue/dashboard");
  const venue = dash.venues[0];
  const staff = venue
    ? await apiFetch<StaffRow[]>(`/api/v1/venue/staff?venueId=${venue._id}`)
    : [];
  logInfo("page.venueStaff", { count: staff.length, venueId: venue?._id });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Venue</div>
          <h1>Staff</h1>
          {venue ? <p className="admin-muted">{venue.name}</p> : null}
        </div>
      </div>

      <ModuleTip>
        Add staff by the email of an existing Dink account. Staff can manage courts and bookings;
        only owners can manage this list.
      </ModuleTip>

      {venue ? <AddStaffForm venueId={venue._id} /> : null}

      <DataTable
        rows={staff}
        columns={[
          {
            key: "name",
            header: "Name",
            render: (s) => (
              <div>
                <strong>{s.displayName}</strong>
                <div className="admin-muted">{s.email || s.userId}</div>
              </div>
            ),
          },
          { key: "role", header: "Role", render: (s) => s.role },
          {
            key: "actions",
            header: "Actions",
            render: (s) =>
              s.role === "venue_staff" && venue ? (
                <VenueStaffRemoveButton venueId={venue._id} userId={s.userId} />
              ) : (
                <span className="admin-muted">—</span>
              ),
          },
        ]}
        empty="No staff members yet."
      />
    </>
  );
}
