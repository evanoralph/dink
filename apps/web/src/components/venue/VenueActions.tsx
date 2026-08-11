"use client";

import { useRouter } from "next/navigation";
import { clientApiFetch } from "@/lib/api-client";
import { logError, logInfo } from "@/lib/logger";

async function runAction(path: string, body: unknown, event: string) {
  try {
    await clientApiFetch(path, { method: "POST", body });
    logInfo(event, body as Record<string, unknown>);
    return true;
  } catch (error) {
    logError(`${event}.fail`, {
      message: error instanceof Error ? error.message : "unknown",
    });
    alert(error instanceof Error ? error.message : "Action failed");
    return false;
  }
}

export function VenueCourtActiveToggle({
  courtId,
  active,
}: {
  courtId: string;
  active: boolean;
}) {
  const router = useRouter();
  return (
    <button
      className={active ? "btn-primary" : "btn-secondary"}
      style={{ height: 30, padding: "0 10px", fontSize: 11 }}
      onClick={async () => {
        const ok = await runAction(
          "/venue/courts/active",
          { courtId, active: !active },
          "venue.courtActive",
        );
        if (ok) router.refresh();
      }}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export function VenueBookingStatusActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  return (
    <div className="admin-row-actions">
      {(["confirmed", "cancelled", "completed"] as const).map((status) => (
        <button
          key={status}
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/venue/bookings/status",
              { bookingId, status },
              "venue.bookingStatus",
            );
            if (ok) router.refresh();
          }}
        >
          {status}
        </button>
      ))}
    </div>
  );
}

export function VenueStaffRemoveButton({
  venueId,
  userId,
}: {
  venueId: string;
  userId: string;
}) {
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      style={{ height: 30, padding: "0 10px", fontSize: 11 }}
      onClick={async () => {
        if (!confirm("Remove this staff member from the venue?")) return;
        const ok = await runAction(
          "/venue/staff/remove",
          { venueId, userId },
          "venue.staffRemove",
        );
        if (ok) router.refresh();
      }}
    >
      Remove
    </button>
  );
}
