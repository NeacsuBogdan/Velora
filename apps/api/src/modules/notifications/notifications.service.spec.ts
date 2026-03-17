import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@velora/contracts";

import { NotificationsService } from "./notifications.service";

const viewer: AuthenticatedUser = {
  id: "user-1",
  email: "customer@velora.local",
  firstName: "Daria",
  lastName: "Ionescu",
  roles: [
    {
      code: "CUSTOMER",
      name: "Customer"
    }
  ]
};

describe("NotificationsService", () => {
  const prisma = {
    notification: {
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      createMany: vi.fn()
    },
    user: {
      findMany: vi.fn()
    }
  };

  let service: NotificationsService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new NotificationsService(prisma as never);
  });

  it("lists the feed with unread count", async () => {
    prisma.notification.findMany.mockResolvedValue([
      {
        id: "note-1",
        title: "Order placed",
        message: "Your order is confirmed.",
        kind: "ORDER",
        level: "SUCCESS",
        linkUrl: "/account/orders/VLR-20260317-0001",
        createdAt: new Date("2026-03-17T18:00:00.000Z"),
        readAt: null
      }
    ]);
    prisma.notification.count.mockResolvedValue(1);

    const result = await service.getFeed(viewer, {});

    expect(result.unreadCount).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("Order placed");
  });

  it("marks a single notification as read", async () => {
    prisma.notification.findFirst.mockResolvedValue({
      id: "note-1",
      userId: viewer.id,
      readAt: null
    });
    prisma.notification.update.mockResolvedValue(undefined);
    prisma.notification.count.mockResolvedValue(0);

    const result = await service.markRead(viewer, "note-1");

    expect(prisma.notification.update).toHaveBeenCalled();
    expect(result.unreadCount).toBe(0);
  });

  it("fans out admin notifications to active admin users", async () => {
    prisma.user.findMany.mockResolvedValue([
      { id: "admin-1" },
      { id: "admin-2" }
    ]);
    prisma.notification.createMany.mockResolvedValue({ count: 2 });

    const result = await service.notifyAdmins({
      kind: "SELLER_APPLICATION",
      level: "ACTION_REQUIRED",
      title: "New seller application",
      message: "North Star Gadgets is awaiting review."
    });

    expect(prisma.notification.createMany).toHaveBeenCalled();
    expect(result.count).toBe(2);
  });
});
