import { BadRequestException, ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@velora/contracts";

import { AdminService } from "./admin.service";

const viewer: AuthenticatedUser = {
  id: "cadmin001",
  email: "admin@velora.local",
  firstName: "Admin",
  lastName: "User",
  roles: [
    {
      code: "ADMIN",
      name: "Administrator"
    }
  ]
};

function createService() {
  const prisma = {
    category: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    inventoryItem: {
      findUnique: vi.fn()
    },
    order: {
      findUnique: vi.fn()
    },
    reindexJob: {
      create: vi.fn(),
      update: vi.fn()
    },
    jobRun: {
      create: vi.fn(),
      update: vi.fn()
    },
    searchSyncLog: {
      createMany: vi.fn(),
      create: vi.fn()
    }
  };
  const auditService = {
    record: vi.fn()
  };
  const inventoryService = {
    releaseExpiredReservations: vi.fn()
  };
  const projectionService = {
    collectDocuments: vi.fn(),
    syncProjectionRecords: vi.fn()
  };
  const openSearchService = {
    replaceDocuments: vi.fn()
  };
  const cacheService = {
    deleteByPrefix: vi.fn()
  };

  return {
    prisma,
    auditService,
    inventoryService,
    projectionService,
    openSearchService,
    cacheService,
    service: new AdminService(
      prisma as never,
      auditService as never,
      inventoryService as never,
      projectionService as never,
      openSearchService as never,
      cacheService as never
    )
  };
}

describe("AdminService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates a category and records an audit entry", async () => {
    const { prisma, auditService, service } = createService();
    prisma.category.findUnique.mockResolvedValue(null);
    prisma.category.create.mockResolvedValue({
      id: "ccategory900",
      name: "Wearables",
      slug: "wearables",
      description: "Smart watches and trackers.",
      parentId: null,
      parent: null,
      sortOrder: 6,
      isActive: true,
      updatedAt: new Date("2026-03-13T10:00:00.000Z"),
      _count: {
        children: 0,
        products: 0
      }
    });

    const result = await service.createCategory(viewer, {
      name: "Wearables",
      slug: "wearables",
      description: "Smart watches and trackers.",
      parentId: null,
      sortOrder: 6,
      isActive: true
    });

    expect(result.slug).toBe("wearables");
    expect(prisma.category.create).toHaveBeenCalledOnce();
    expect(auditService.record).toHaveBeenCalledWith(
      viewer.id,
      "CATEGORY",
      "ccategory900",
      "CATEGORY_CREATED",
      {
        slug: "wearables"
      }
    );
  });

  it("rejects inventory updates that would drop below reserved stock", async () => {
    const { prisma, service } = createService();
    prisma.inventoryItem.findUnique.mockResolvedValue({
      id: "cinventory001",
      listingId: "clisting001",
      onHand: 8,
      reserved: 5,
      safetyStock: 1,
      updatedAt: new Date(),
      listing: {
        id: "clisting001",
        sellerId: "cseller001",
        sellerSku: "SKU-1",
        leadTimeDays: 2,
        productId: "cproduct001",
        product: {
          id: "cproduct001",
          title: "NordWave Edge S",
          slug: "nordwave-edge-s",
          status: "ACTIVE"
        },
        seller: {
          id: "cseller001",
          displayName: "North Star Electronics"
        }
      }
    });

    await expect(
      service.updateInventory(viewer, "cinventory001", {
        onHand: 4,
        safetyStock: 1,
        leadTimeDays: 2,
        note: "Manual correction"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("blocks direct refund status changes before a refund is recorded", async () => {
    const { prisma, service } = createService();
    prisma.order.findUnique.mockResolvedValue({
      id: "corder001",
      number: "VLR-20260313-0001",
      status: "PROCESSING",
      paymentStatus: "SUCCEEDED"
    });

    await expect(
      service.updateOrderStatus(viewer, "VLR-20260313-0001", {
        status: "REFUNDED",
        note: "Operator override"
      })
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("executes a full reindex and persists successful job state", async () => {
    const { prisma, auditService, projectionService, openSearchService, service } =
      createService();
    prisma.reindexJob.create.mockResolvedValue({
      id: "creindex001"
    });
    prisma.jobRun.create.mockResolvedValue({
      id: "cjob001"
    });
    projectionService.collectDocuments.mockResolvedValue([
      {
        listingId: "clisting001"
      }
    ]);
    projectionService.syncProjectionRecords.mockResolvedValue(undefined);
    openSearchService.replaceDocuments.mockResolvedValue(true);
    prisma.searchSyncLog.createMany.mockResolvedValue(undefined);
    prisma.reindexJob.update.mockResolvedValue(undefined);
    prisma.jobRun.update.mockResolvedValue(undefined);
    auditService.record.mockResolvedValue(undefined);

    const result = await service.triggerReindex(viewer, {
      scope: "catalog-full"
    });

    expect(result.status).toBe("SUCCEEDED");
    expect(result.processedDocuments).toBe(1);
    expect(projectionService.syncProjectionRecords).toHaveBeenCalledOnce();
    expect(openSearchService.replaceDocuments).toHaveBeenCalledOnce();
    expect(prisma.reindexJob.update).toHaveBeenCalledOnce();
    expect(prisma.jobRun.update).toHaveBeenCalledOnce();
  });
});
