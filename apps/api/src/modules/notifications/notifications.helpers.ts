import { notificationSummarySchema } from "@velora/contracts";
import type { Prisma } from "@prisma/client";

export type NotificationRecord = Prisma.NotificationGetPayload<object>;

export function mapNotificationSummary(notification: NotificationRecord) {
  return notificationSummarySchema.parse({
    notificationId: notification.id,
    title: notification.title,
    message: notification.message,
    kind: notification.kind,
    level: notification.level,
    linkUrl: notification.linkUrl ?? null,
    isRead: Boolean(notification.readAt),
    createdAt: notification.createdAt.toISOString(),
    readAt: notification.readAt?.toISOString() ?? null
  });
}
