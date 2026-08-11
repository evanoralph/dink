import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

export function DataTable<T extends { _id?: string }>({
  columns,
  rows,
  empty = "No results",
  total,
  page,
  pageSize,
}: {
  columns: Column<T>[];
  rows: T[];
  empty?: string;
  total?: number;
  page?: number;
  pageSize?: number;
}) {
  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} className={col.className}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="admin-table-empty">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row, idx) => (
              <tr key={row._id || String(idx)}>
                {columns.map((col) => (
                  <td key={col.key} className={col.className}>
                    {col.render(row)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {total != null && page != null && pageSize != null ? (
        <div className="admin-table-meta">
          Showing {rows.length ? (page - 1) * pageSize + 1 : 0}–
          {(page - 1) * pageSize + rows.length} of {total}
        </div>
      ) : null}
    </div>
  );
}
