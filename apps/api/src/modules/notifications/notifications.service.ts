import { Injectable, NotFoundException } from "@nestjs/common";
import {
  markAllNotificationsReadResponseSchema,
  markNotificationReadResponseSchema,
  notificationFeedSchema,
  notificationLevelSchema,
  notificationKindSchema,
  type AuthenticatedUser
} from "@velora/contracts";
import { Prisma, type NotificationLevel, type NotificationKind } from "@prisma/client";
import { z } from "zod";

import { PrismaService } from "../database/prisma.service";
import { mapNotificationSummary } from "./notifications.helpers";

const notificationsQuerySchema = z.object({
  limit: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : typeof value === "number"
          ? value
          : undefined,
    z.number().int().min(1).max(50).default(12)
  ),
  unreadOnly: z.preprocess(
    (value) => value === true || value === "true",
    z.boolean().default(false)
  )
});

type NotificationDraft = {
  title: string;
  message: string;
  kind: NotificationKind;
  level?: NotificationLevel;
  linkUrl?: string | null;
  actorUserId?: string | null;
  metadata?: Prisma.InputJsonValue | null;
};

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeed(viewer: AuthenticatedUser, rawQuery: Record<string, unknown>) {
    const query = notificationsQuerySchema.parse(rawQuery);
    const where = {
      userId: viewer.id,
      ...(query.unreadOnly ? { readAt: null } : {})
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: [{ readAt: "asc" }, { createdAt: "desc" }],
        take: query.limit
      }),
      this.prisma.notification.count({
        where: {
          userId: viewer.id,
          readAt: null
        }
      })
    ]);

    return notificationFeedSchema.parse({
      unreadCount,
      items: items.map((item) => mapNotificationSummary(item))
    });
  }

  async markRead(viewer: AuthenticatedUser, notificationId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: viewer.id
      }
    });

    if (!notification) {
      throw new NotFoundException(
        `Notification ${notificationId} was not found for this user.`
      );
    }

    if (!notification.readAt) {
      await this.prisma.notification.update({
        where: {
          id: notificationId
        },
        data: {
          readAt: new Date()
        }
      });
    }

    const unreadCount = await this.prisma.notification.count({
      where: {
        userId: viewer.id,
        readAt: null
      }
    });

    return markNotificationReadResponseSchema.parse({
      notificationId,
      unreadCount
    });
  }

  async markAllRead(viewer: AuthenticatedUser) {
    const result = await this.prisma.notification.updateMany({
      where: {
        userId: viewer.id,
        readAt: null
      },
      data: {
        readAt: new Date()
      }
    });

    return markAllNotificationsReadResponseSchema.parse({
      markedCount: result.count,
      unreadCount: 0
    });
  }

  async notifyUser(userId: string, draft: NotificationDraft) {
    return this.notifyUsers([userId], draft);
  }

  async notifyUsers(userIds: string[], draft: NotificationDraft) {
    const kind = notificationKindSchema.parse(draft.kind);
    const level = notificationLevelSchema.parse(draft.level ?? "INFO");
    const dedupedUserIds = Array.from(
      new Set(userIds.map((userId) => userId.trim()).filter(Boolean))
    );

    if (dedupedUserIds.length === 0) {
      return { count: 0 };
    }

    return this.prisma.notification.createMany({
      data: dedupedUserIds.map((userId) => ({
        userId,
        actorUserId: draft.actorUserId ?? undefined,
        kind,
        level,
        title: draft.title,
        message: draft.message,
        linkUrl: draft.linkUrl ?? undefined,
        metadata: draft.metadata ?? undefined
      }))
    });
  }

  async notifyAdmins(draft: NotificationDraft) {
    const admins = await this.prisma.user.findMany({
      where: {
        isActive: true,
        roleAssignments: {
          some: {
            role: {
              code: "ADMIN"
            }
          }
        }
      },
      select: {
        id: true
      }
    });

    return this.notifyUsers(
      admins.map((admin) => admin.id),
      draft
    );
  }
}
