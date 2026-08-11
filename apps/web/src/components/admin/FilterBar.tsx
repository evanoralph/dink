"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { logDebug } from "@/lib/logger";

export type FilterField =
  | { name: string; label: string; type: "text"; placeholder?: string }
  | { name: string; label: string; type: "date" }
  | {
      name: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
    };

export function FilterBar({ fields }: { fields: FilterField[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const f of fields) {
      init[f.name] = searchParams.get(f.name) || "";
    }
    return init;
  });

  function apply(nextPage?: number) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(values)) {
      if (v) qs.set(k, v);
    }
    if (nextPage && nextPage > 1) qs.set("page", String(nextPage));
    else qs.delete("page");
    const url = qs.toString() ? `${pathname}?${qs}` : pathname;
    logDebug("admin.filter.apply", { pathname, query: qs.toString() });
    startTransition(() => router.push(url));
  }

  return (
    <form
      className="admin-filters"
      onSubmit={(e) => {
        e.preventDefault();
        apply(1);
      }}
    >
      {fields.map((field) => (
        <label key={field.name} className="admin-filter-field">
          <span>{field.label}</span>
          {field.type === "select" ? (
            <select
              className="input"
              value={values[field.name] || ""}
              onChange={(e) => setValues((s) => ({ ...s, [field.name]: e.target.value }))}
            >
              <option value="">All</option>
              {field.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          ) : (
            <input
              className="input"
              type={field.type}
              placeholder={field.type === "text" ? field.placeholder : undefined}
              value={values[field.name] || ""}
              onChange={(e) => setValues((s) => ({ ...s, [field.name]: e.target.value }))}
            />
          )}
        </label>
      ))}
      <div className="admin-filter-actions">
        <button type="submit" className="btn-primary" disabled={pending} style={{ height: 36, padding: "0 14px" }}>
          Filter
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ height: 36, padding: "0 14px" }}
          onClick={() => {
            const cleared: Record<string, string> = {};
            for (const f of fields) cleared[f.name] = "";
            setValues(cleared);
            startTransition(() => router.push(pathname));
          }}
        >
          Reset
        </button>
      </div>
    </form>
  );
}

export function Pagination({
  page,
  pageSize,
  total,
}: {
  page: number;
  pageSize: number;
  total: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pages = Math.max(1, Math.ceil(total / pageSize));

  function go(next: number) {
    const qs = new URLSearchParams(searchParams.toString());
    if (next <= 1) qs.delete("page");
    else qs.set("page", String(next));
    router.push(qs.toString() ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="admin-pagination">
      <button className="btn-secondary" style={{ height: 32, padding: "0 12px" }} disabled={page <= 1} onClick={() => go(page - 1)}>
        Prev
      </button>
      <span>
        Page {page} / {pages}
      </span>
      <button className="btn-secondary" style={{ height: 32, padding: "0 12px" }} disabled={page >= pages} onClick={() => go(page + 1)}>
        Next
      </button>
    </div>
  );
}
