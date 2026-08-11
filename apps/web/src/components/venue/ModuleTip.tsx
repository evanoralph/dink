export function ModuleTip({ children }: { children: string }) {
  return (
    <div className="admin-panel" style={{ marginBottom: 16, padding: "12px 16px" }}>
      <div className="label" style={{ marginBottom: 4 }}>
        Tip
      </div>
      <p className="admin-muted" style={{ margin: 0 }}>
        {children}
      </p>
    </div>
  );
}
