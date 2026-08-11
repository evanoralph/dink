export function KpiGrid({
  items,
}: {
  items: { label: string; value: string | number; hint?: string }[];
}) {
  return (
    <div className="admin-kpi-grid">
      {items.map((item) => (
        <div key={item.label} className="admin-kpi">
          <div className="admin-kpi-value">{item.value}</div>
          <div className="admin-kpi-label">{item.label}</div>
          {item.hint ? <div className="admin-kpi-hint">{item.hint}</div> : null}
        </div>
      ))}
    </div>
  );
}
