import { FlagToggle } from "@/components/FlagToggle";
import { apiFetch } from "@/lib/api";
import { logInfo } from "@/lib/logger";

type Flag = {
  _id: string;
  key: string;
  enabled: boolean;
  description?: string;
};

export default async function AdminFeatureFlagsPage() {
  const flags = await apiFetch<Flag[]>("/api/v1/admin/feature-flags");
  logInfo("page.adminFlags", { count: flags.length });

  return (
    <>
      <div className="admin-page-header">
        <div>
          <div className="label">Admin</div>
          <h1>Feature flags</h1>
        </div>
      </div>
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Description</th>
              <th>State</th>
            </tr>
          </thead>
          <tbody>
            {flags.map((f) => (
              <tr key={f._id || f.key}>
                <td className="admin-mono">{f.key}</td>
                <td className="admin-muted">{f.description || "—"}</td>
                <td>
                  <FlagToggle flagKey={f.key} enabled={f.enabled} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
