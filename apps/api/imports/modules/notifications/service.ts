import { Email } from "meteor/email";
import { Meteor } from "meteor/meteor";
import { Notifications } from "../../collections";
import { logDebug, logInfo, logWarn } from "../../lib/logger";

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body: string;
  entityType?: string;
  entityId?: string;
  /** When false, inbox only (no email attempt). Default true. */
  email?: boolean;
};

async function resolveUserEmail(userId: string): Promise<string | null> {
  const user = await Meteor.users.findOneAsync(userId);
  const email = user?.emails?.[0]?.address;
  return email || null;
}

async function sendEmail(to: string, subject: string, text: string) {
  const mailUrl = process.env.MAIL_URL;
  const from = process.env.MAIL_FROM || "Dink <noreply@dink.local>";
  if (!mailUrl) {
    logInfo("notifications.email.skipped", { to, subject, reason: "MAIL_URL_unset" });
    return "skipped" as const;
  }
  try {
    await Email.sendAsync({ from, to, subject, text });
    logInfo("notifications.email.sent", { to, subject });
    return "sent" as const;
  } catch (error) {
    logWarn("notifications.email.fail", {
      to,
      subject,
      message: error instanceof Error ? error.message : String(error),
    });
    return "failed" as const;
  }
}

/** Insert inbox row + best-effort email (P1-07). */
export async function notifyUser(input: NotifyInput) {
  const now = new Date();
  let emailStatus: "sent" | "skipped" | "failed" = "skipped";

  if (input.email !== false) {
    const to = await resolveUserEmail(input.userId);
    if (to) {
      emailStatus = await sendEmail(to, input.title, input.body);
    } else {
      logDebug("notifications.email.no_address", { userId: input.userId, type: input.type });
      emailStatus = "skipped";
    }
  }

  const id = await Notifications.insertAsync({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.body,
    read: false,
    createdAt: now,
    entityType: input.entityType,
    entityId: input.entityId,
    emailStatus,
  });

  logInfo("notifications.created", {
    notificationId: id,
    userId: input.userId,
    type: input.type,
    emailStatus,
  });
  return id;
}

export async function notifyUsers(
  userIds: string[],
  payload: Omit<NotifyInput, "userId">,
) {
  const unique = [...new Set(userIds.filter(Boolean))];
  for (const userId of unique) {
    await notifyUser({ ...payload, userId });
  }
}
