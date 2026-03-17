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
      create: vi.fn(),
      update: vi.fn()
    },
    sellerProductListing: {
      create: vi.fn(),
      update: vi.fn()
    },
    price: {
      create: vi.fn()
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
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn()
    },
    inventoryItem: {
      findFirst: vi.fn()
    },
    sellerProductListing: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
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
    collectDocumentsByListingIds: vi.fn().mockResolvedValue([]),
    removeProjectionRecords: vi.fn().mockResolvedValue(undefined),
    syncProjectionRecords: vi.fn().mockResolvedValue(undefined)
  };
  const openSearchService = {
    removeDocuments: vi.fn().mockResolvedValue(true),
    syncDocuments: vi.fn().mockResolvedValue(true)
  };
  const cacheService = {
    deleteByPrefix: vi.fn().mockResolvedValue(undefined)
  };

  return {
    tx,
    prisma,
    auditService,
    projectionService,
    openSearchService,
    cacheService,
    service: new SellerService(
      prisma as never,
      auditService as never,
      projectionService as never,
      openSearchService as never,
      cacheService as never
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

  it("updates seller-owned listing pricing and visibility", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.sellerProductListing.findFirst.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      productId: "product-1",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:00:00.000Z"),
      prices: [
        {
          amount: 449900,
          compareAtAmount: 479900,
          currency: "RON",
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-01T08:00:00.000Z")
        }
      ],
      product: {
        id: "product-1",
        status: "ACTIVE",
        slug: "astra-x1-pro",
        title: "Astra X1 Pro",
        media: []
      },
      variant: null,
      inventoryItem: {
        id: "inventory-1",
        onHand: 12,
        reserved: 2,
        safetyStock: 1
      }
    });
    prisma.sellerProductListing.findUniqueOrThrow.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      productId: "product-1",
      status: "ACTIVE",
      isActive: false,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:05:00.000Z"),
      prices: [
        {
          amount: 429900,
          compareAtAmount: 459900,
          currency: "RON",
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-17T08:05:00.000Z")
        }
      ],
      product: {
        id: "product-1",
        status: "ACTIVE",
        slug: "astra-x1-pro",
        title: "Astra X1 Pro",
        media: []
      },
      variant: null,
      inventoryItem: {
        id: "inventory-1",
        onHand: 12,
        reserved: 2,
        safetyStock: 1
      }
    });
    prisma.searchSyncLog.createMany.mockResolvedValue(undefined);

    const result = await service.updateListing(viewer, "listing-1", {
      priceAmount: 429900,
      compareAtAmount: 459900,
      isActive: false,
      note: "Seasonal merchant pricing adjustment."
    });

    expect(result.price?.amount).toBe(429900);
    expect(result.isActive).toBe(false);
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it("creates a seller-owned offer against the shared catalog", async () => {
    const { prisma, service, tx } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.sellerProductListing.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prisma.product.findUnique.mockResolvedValue({
      id: "cproduct0001",
      slug: "astra-x1-pro",
      title: "Astra X1 Pro",
      status: "ACTIVE",
      brand: {
        name: "Astra"
      },
      category: {
        name: "Phones"
      },
      media: [],
      variants: [
        {
          id: "cvariant0001",
          title: "256 GB / Midnight",
          isDefault: true
        }
      ],
      listings: []
    });
    tx.sellerProductListing.create.mockResolvedValue({
      id: "listing-3",
      isActive: true
    });
    prisma.sellerProductListing.findUniqueOrThrow.mockResolvedValue({
      id: "listing-3",
      sellerId: "seller-1",
      productId: "cproduct0001",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-NEW",
      updatedAt: new Date("2026-03-17T09:00:00.000Z"),
      prices: [
        {
          amount: 399900,
          compareAtAmount: 429900,
          currency: "RON",
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-17T09:00:00.000Z")
        }
      ],
      product: {
        id: "cproduct0001",
        status: "ACTIVE",
        slug: "astra-x1-pro",
        title: "Astra X1 Pro",
        media: []
      },
      variant: {
        title: "256 GB / Midnight"
      },
      inventoryItem: {
        id: "inventory-3",
        onHand: 8,
        reserved: 0,
        safetyStock: 1
      }
    });

    const result = await service.createListing(viewer, {
      productId: "cproduct0001",
      variantId: "cvariant0001",
      sellerSku: "NST-AX1P-NEW",
      leadTimeDays: 2,
      priceAmount: 399900,
      compareAtAmount: 429900,
      onHand: 8,
      safetyStock: 1,
      isActive: true
    });

    expect(result.listingId).toBe("listing-3");
    expect(result.sellerSku).toBe("NST-AX1P-NEW");
    expect(tx.sellerProductListing.create).toHaveBeenCalled();
  });

  it("archives seller-owned offers and removes them from search", async () => {
    const { openSearchService, prisma, projectionService, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.sellerProductListing.findFirst.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      productId: "product-1",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:00:00.000Z"),
      prices: [],
      product: {
        id: "product-1",
        status: "ACTIVE",
        slug: "astra-x1-pro",
        title: "Astra X1 Pro",
        media: []
      },
      variant: null,
      inventoryItem: {
        id: "inventory-1",
        onHand: 12,
        reserved: 0,
        safetyStock: 1
      }
    });
    prisma.sellerProductListing.findUniqueOrThrow.mockResolvedValue({
      id: "listing-1",
      sellerId: "seller-1",
      productId: "product-1",
      status: "ARCHIVED",
      isActive: false,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:15:00.000Z"),
      prices: [],
      product: {
        id: "product-1",
        status: "ACTIVE",
        slug: "astra-x1-pro",
        title: "Astra X1 Pro",
        media: []
      },
      variant: null,
      inventoryItem: {
        id: "inventory-1",
        onHand: 12,
        reserved: 0,
        safetyStock: 1
      }
    });

    const result = await service.archiveListing(viewer, "listing-1");

    expect(result.status).toBe("ARCHIVED");
    expect(projectionService.removeProjectionRecords).toHaveBeenCalledWith([
      "listing-1"
    ]);
    expect(openSearchService.removeDocuments).toHaveBeenCalledWith(["listing-1"]);
  });
});
