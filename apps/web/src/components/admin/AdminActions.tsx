"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { clientApiFetch } from "@/lib/api-client";
import { ALL_ROLES } from "@/lib/admin";
import { logInfo, logError } from "@/lib/logger";

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

export function VenueStatusButtons({ venueId }: { venueId: string }) {
  const router = useRouter();
  return (
    <div className="admin-row-actions">
      {(["approved", "rejected", "suspended", "pending"] as const).map((status) => (
        <button
          key={status}
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/admin/venues/status",
              { venueId, status },
              "admin.venueStatus",
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

export function CourtActiveToggle({ courtId, active }: { courtId: string; active: boolean }) {
  const router = useRouter();
  return (
    <button
      className={active ? "btn-primary" : "btn-secondary"}
      style={{ height: 30, padding: "0 10px", fontSize: 11 }}
      onClick={async () => {
        const ok = await runAction(
          "/admin/courts/active",
          { courtId, active: !active },
          "admin.courtActive",
        );
        if (ok) router.refresh();
      }}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

export function BookingStatusActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  return (
    <div className="admin-row-actions">
      {(["confirmed", "cancelled", "completed", "expired"] as const).map((status) => (
        <button
          key={status}
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/admin/bookings/status",
              { bookingId, status },
              "admin.bookingStatus",
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

export function PaymentStatusActions({
  paymentId,
  status,
}: {
  paymentId: string;
  status: string;
}) {
  const router = useRouter();
  return (
    <div className="admin-row-actions">
      {status === "paid" ? (
        <button
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/admin/payments/status",
              { paymentId, status: "refunded" },
              "admin.paymentRefund",
            );
            if (ok) router.refresh();
          }}
        >
          Refund
        </button>
      ) : null}
      {status === "pending" ? (
        <button
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/admin/payments/status",
              { paymentId, status: "void" },
              "admin.paymentVoid",
            );
            if (ok) router.refresh();
          }}
        >
          Void
        </button>
      ) : null}
    </div>
  );
}

export function GameStatusActions({ gameId }: { gameId: string }) {
  const router = useRouter();
  return (
    <div className="admin-row-actions">
      {(["cancelled", "completed", "open"] as const).map((status) => (
        <button
          key={status}
          className="btn-secondary"
          style={{ height: 30, padding: "0 10px", fontSize: 11 }}
          onClick={async () => {
            const ok = await runAction(
              "/admin/games/status",
              { gameId, status },
              "admin.gameStatus",
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

export function UserRolesEditor({
  userId,
  roles,
}: {
  userId: string;
  roles: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(roles);
  const [busy, setBusy] = useState(false);

  return (
    <div className="admin-roles-editor">
      <div className="admin-roles-list">
        {ALL_ROLES.map((role) => (
          <label key={role} className="admin-role-chip">
            <input
              type="checkbox"
              checked={selected.includes(role)}
              onChange={(e) => {
                setSelected((prev) =>
                  e.target.checked ? [...prev, role] : prev.filter((r) => r !== role),
                );
              }}
            />
            {role}
          </label>
        ))}
      </div>
      <button
        className="btn-primary"
        style={{ height: 30, padding: "0 10px", fontSize: 11 }}
        disabled={busy || !selected.length}
        onClick={async () => {
          setBusy(true);
          const ok = await runAction(
            "/admin/users/roles",
            { userId, roles: selected },
            "admin.userRoles",
          );
          setBusy(false);
          if (ok) router.refresh();
        }}
      >
        Save roles
      </button>
    </div>
  );
}
