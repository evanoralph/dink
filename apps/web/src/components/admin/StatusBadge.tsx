export function StatusBadge({ status }: { status?: string | null }) {
  const value = (status || "unknown").toLowerCase();
  return <span className={`admin-badge admin-badge--${value}`}>{value}</span>;
}
