import {
  ConflictException,
  NotFoundException
} from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser } from "@velora/contracts";

import { SellerService } from "./seller.service";

const viewer: AuthenticatedUser = {
  id: "seller-user-1",
  email: "seller@velora.local",
  firstName: "Verified",
  lastName: "Merchant",
  roles: [
    {
      code: "SELLER",
      name: "Seller"
    }
  ]
};

function createService() {
  const tx = {
    inventoryItem: {
      update: vi.fn()
    },
    sellerProductListing: {
      update: vi.fn()
    },
    inventoryMovement: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };
  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
    seller: {
      findUnique: vi.fn()
    },
    inventoryItem: {
      findFirst: vi.fn()
    },
    sellerProductListing: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn()
    },
    order: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    stockReservation: {
      aggregate: vi.fn()
    },
    searchSyncLog: {
      createMany: vi.fn()
    }
  };
  const auditService = {
    record: vi.fn()
  };
  const projectionService = {
    collectDocumentsByListingIds: vi.fn(),
    syncProjectionRecords: vi.fn()
  };
  const openSearchService = {
    syncDocuments: vi.fn()
  };

  return {
    prisma,
    auditService,
    projectionService,
    openSearchService,
    service: new SellerService(
      prisma as never,
      auditService as never,
      projectionService as never,
      openSearchService as never
    )
  };
}

describe("SellerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns seller-scoped order totals for mixed marketplace orders", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.order.findMany.mockResolvedValue([
      {
        id: "order-1",
        number: "VEL-2026-0101",
        status: "PAID",
        paymentStatus: "SUCCEEDED",
        currency: "RON",
        subtotal: 60000,
        discountTotal: 6000,
        total: 54000,
        createdAt: new Date("2026-03-13T10:00:00.000Z"),
        placedAt: new Date("2026-03-13T10:05:00.000Z"),
        user: {
          email: "customer@velora.local",
          firstName: "Demo",
          lastName: "Customer"
        },
        items: [
          {
            id: "item-1",
            listingId: "listing-1",
            productId: "product-1",
            quantity: 1,
            unitPrice: 20000,
            totalPrice: 20000,
            productTitleSnapshot: "Seller product",
            sellerNameSnapshot: "North Star Electronics",
            listing: {
              sellerId: "seller-1",
              seller: {
                slug: "north-star-electronics"
              }
            },
            product: {
              slug: "seller-product"
            }
          },
          {
            id: "item-2",
            listingId: "listing-2",
            productId: "product-2",
            quantity: 1,
            unitPrice: 40000,
            totalPrice: 40000,
            productTitleSnapshot: "Other seller product",
            sellerNameSnapshot: "Other seller",
            listing: {
              sellerId: "seller-2",
              seller: {
                slug: "other-seller"
              }
            },
            product: {
              slug: "other-seller-product"
            }
          }
        ],
        paymentAttempt: {
          refunds: []
        },
        statusHistory: []
      }
    ]);

    const result = await service.listOrders(viewer);

    expect(result).toHaveLength(1);
    expect(result[0]?.itemCount).toBe(1);
    expect(result[0]?.subtotal.amount).toBe(20000);
    expect(result[0]?.discountTotal.amount).toBe(2000);
    expect(result[0]?.total.amount).toBe(18000);
    expect(result[0]?.customer.label).toBe("Demo Customer");
  });

  it("rejects inventory updates below the reserved quantity", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.inventoryItem.findFirst.mockResolvedValue({
      id: "inventory-1",
      listingId: "listing-1",
      onHand: 8,
      reserved: 5,
      safetyStock: 1
    });

    await expect(
      service.updateInventory(viewer, "inventory-1", {
        onHand: 4,
        safetyStock: 1,
        leadTimeDays: 2,
        note: "Correction"
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("hides order detail that is outside the seller scope", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.order.findFirst.mockResolvedValue(null);

    await expect(
      service.getOrderDetail(viewer, "VEL-2026-9999")
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
