import { Suspense } from "react";
import { PaymentStatusActions } from "@/components/admin/AdminActions";
import { CsvExportButton } from "@/components/admin/CsvExportButton";
import { DataTable } from "@/components/admin/DataTable";
import { FilterBar, Pagination } from "@/components/admin/FilterBar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { apiFetch } from "@/lib/api";
import {
  PAYMENT_STATUSES,
  buildQuery,
  formatDate,
  formatMoney,
  type AdminListResult,
  type AdminSearchParams,
} from "@/lib/admin";
import { logInfo } from "@/lib/logger";

type Payment = {
  _id: string;
  bookingId: string;
  userId: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<AdminSearchParams>;
}) {
  const params = await searchParams;
  const data = await apiFetch<AdminListResult<Payment>>(
    `/api/v1/admin/payments${buildQuery(params)}`,
  );
  logInfo("page.adminPayments", { total: data.total, page: data.page });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Payments</h1>
        </div>
        <Suspense>
          <CsvExportButton entity="payments" />
        </Suspense>
      </div>
      <Suspense>
        <FilterBar
          fields={[
            {
              name: "status",
              label: "Status",
              type: "select",
              options: PAYMENT_STATUSES.map((s) => ({ value: s, label: s })),
            },
            { name: "venueId", label: "Venue ID", type: "text" },
            { name: "userId", label: "User ID", type: "text" },
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
            header: "Payment",
            render: (p) => <span className="admin-mono">{p._id.slice(0, 10)}…</span>,
          },
          {
            key: "booking",
            header: "Booking",
            render: (p) => <span className="admin-mono">{p.bookingId.slice(0, 10)}…</span>,
          },
          {
            key: "amount",
            header: "Amount",
            render: (p) => formatMoney(p.amount, p.currency),
          },
          { key: "provider", header: "Provider", render: (p) => p.provider },
          {
            key: "created",
            header: "Created",
            render: (p) => formatDate(p.createdAt),
          },
          {
            key: "status",
            header: "Status",
            render: (p) => <StatusBadge status={p.status} />,
          },
          {
            key: "actions",
            header: "Actions",
            render: (p) => <PaymentStatusActions paymentId={p._id} status={p.status} />,
          },
        ]}
      />
      <Suspense>
        <Pagination page={data.page} pageSize={data.pageSize} total={data.total} />
      </Suspense>
    </>
  );
}
