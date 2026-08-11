import { AdminAuditLogs } from "../collections";
import { logInfo } from "./logger";

export async function writeAdminAudit(input: {
  actorUserId: string;
  action: string;
  entityType: string;
  entityId: string;
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
}) {
  const doc = {
    actorUserId: input.actorUserId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    before: input.before || undefined,
    after: input.after || undefined,
    createdAt: new Date(),
  };
  const id = await AdminAuditLogs.insertAsync(doc);
  logInfo("admin.audit", {
    auditId: id,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    actorUserId: input.actorUserId,
  });
  return id;
}
