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

function createListingProduct(
  overrides: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    id: "product-1",
    status: "ACTIVE",
    slug: "astra-x1-pro",
    title: "Astra X1 Pro",
    description:
      "A premium marketplace product record used to validate seller catalog flows.",
    categoryId: "category-1",
    ownerSellerId: null,
    brand: null,
    category: {
      name: "Phones"
    },
    media: [],
    ...overrides
  };
}

function createService() {
  const tx = {
    brand: {
      create: vi.fn(),
      findUnique: vi.fn()
    },
    category: {
      findFirst: vi.fn()
    },
    inventoryItem: {
      create: vi.fn(),
      update: vi.fn()
    },
    product: {
      create: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    productMedia: {
      create: vi.fn(),
      delete: vi.fn(),
      update: vi.fn()
    },
    order: {
      update: vi.fn(),
      findUniqueOrThrow: vi.fn()
    },
    orderStatusHistory: {
      create: vi.fn()
    },
    productVariant: {
      create: vi.fn()
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
    category: {
      findMany: vi.fn()
    },
    inventoryItem: {
      findFirst: vi.fn()
    },
    sellerProductListing: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findFirstOrThrow: vi.fn(),
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
  const notificationsService = {
    notifyAdmins: vi.fn().mockResolvedValue({ count: 1 }),
    notifyUser: vi.fn().mockResolvedValue({ count: 1 })
  };

  return {
    tx,
    prisma,
    auditService,
    projectionService,
    openSearchService,
    cacheService,
    notificationsService,
    service: new SellerService(
      prisma as never,
      auditService as never,
      projectionService as never,
      openSearchService as never,
      cacheService as never,
      notificationsService as never
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
        userId: "customer-user-1",
        customerSnapshot: {
          firstName: "Demo",
          lastName: "Customer",
          email: "customer@velora.local",
          phone: "0700000000"
        },
        deliveryAddressSnapshot: null,
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

  it("uses guest contact snapshots in seller order summaries", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.order.findMany.mockResolvedValue([
      {
        id: "order-guest-1",
        number: "VEL-2026-GUEST",
        status: "PAID",
        paymentStatus: "SUCCEEDED",
        userId: null,
        customerSnapshot: {
          firstName: "Guest",
          lastName: "Buyer",
          email: "guest@velora.local",
          phone: "0711111111"
        },
        deliveryAddressSnapshot: null,
        currency: "RON",
        subtotal: 2000,
        discountTotal: 0,
        total: 2000,
        createdAt: new Date("2026-03-18T10:00:00.000Z"),
        placedAt: new Date("2026-03-18T10:01:00.000Z"),
        user: null,
        items: [
          {
            id: "item-guest-1",
            listingId: "listing-1",
            productId: "product-1",
            quantity: 1,
            unitPrice: 2000,
            totalPrice: 2000,
            productTitleSnapshot: "Guest item",
            sellerNameSnapshot: "North Star Electronics",
            listing: {
              sellerId: "seller-1",
              seller: {
                slug: "north-star-electronics"
              }
            },
            product: {
              slug: "guest-item"
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

    expect(result[0]?.customer.label).toBe("Guest Buyer");
    expect(result[0]?.customer.email).toBe("guest@velora.local");
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

  it("updates seller-managed order status for single-seller fulfillment", async () => {
    const { notificationsService, prisma, service, tx } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      number: "VEL-2026-0001",
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      userId: "customer-user-1",
      customerSnapshot: {
        firstName: "Demo",
        lastName: "Customer",
        email: "customer@velora.local",
        phone: "0700000000"
      },
      deliveryAddressSnapshot: {
        fullName: "Demo Customer",
        line1: "Main street 1",
        line2: null,
        city: "Cluj-Napoca",
        state: "Cluj",
        postalCode: "400001",
        countryCode: "RO",
        phone: "0700000000"
      },
      currency: "RON",
      subtotal: 20000,
      discountTotal: 0,
      total: 20000,
      createdAt: new Date("2026-03-18T10:00:00.000Z"),
      placedAt: new Date("2026-03-18T10:05:00.000Z"),
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
        }
      ],
      paymentAttempt: {
        refunds: []
      },
      statusHistory: []
    });
    tx.order.findUniqueOrThrow.mockResolvedValue({
      id: "order-1",
      number: "VEL-2026-0001",
      status: "PROCESSING",
      paymentStatus: "SUCCEEDED",
      userId: "customer-user-1",
      customerSnapshot: {
        firstName: "Demo",
        lastName: "Customer",
        email: "customer@velora.local",
        phone: "0700000000"
      },
      deliveryAddressSnapshot: {
        fullName: "Demo Customer",
        line1: "Main street 1",
        line2: null,
        city: "Cluj-Napoca",
        state: "Cluj",
        postalCode: "400001",
        countryCode: "RO",
        phone: "0700000000"
      },
      currency: "RON",
      subtotal: 20000,
      discountTotal: 0,
      total: 20000,
      createdAt: new Date("2026-03-18T10:00:00.000Z"),
      placedAt: new Date("2026-03-18T10:05:00.000Z"),
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
        }
      ],
      paymentAttempt: {
        refunds: []
      },
      statusHistory: [
        {
          status: "PROCESSING",
          note: "Seller picked and packed the order.",
          createdAt: new Date("2026-03-18T10:10:00.000Z")
        }
      ]
    });

    const result = await service.updateOrderStatus(viewer, "VEL-2026-0001", {
      status: "PROCESSING",
      note: "Seller picked and packed the order."
    });

    expect(tx.order.update).toHaveBeenCalledWith({
      where: {
        id: "order-1"
      },
      data: {
        status: "PROCESSING"
      }
    });
    expect(tx.orderStatusHistory.create).toHaveBeenCalled();
    expect(notificationsService.notifyUser).toHaveBeenCalled();
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
    expect(result.status).toBe("PROCESSING");
    expect(result.canManageStatus).toBe(true);
  });

  it("rejects seller order status updates on mixed-seller orders", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.order.findFirst.mockResolvedValue({
      id: "order-1",
      number: "VEL-2026-0002",
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      userId: "customer-user-1",
      customerSnapshot: null,
      deliveryAddressSnapshot: null,
      currency: "RON",
      subtotal: 30000,
      discountTotal: 0,
      total: 30000,
      createdAt: new Date("2026-03-18T10:00:00.000Z"),
      placedAt: new Date("2026-03-18T10:05:00.000Z"),
      user: null,
      items: [
        {
          id: "item-1",
          listingId: "listing-1",
          productId: "product-1",
          quantity: 1,
          unitPrice: 10000,
          totalPrice: 10000,
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
          unitPrice: 20000,
          totalPrice: 20000,
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
    });

    await expect(
      service.updateOrderStatus(viewer, "VEL-2026-0002", {
        status: "PROCESSING",
        note: "Trying to process"
      })
    ).rejects.toBeInstanceOf(ConflictException);
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
        ...createListingProduct()
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
        ...createListingProduct()
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
      description:
        "Shared marketplace product available for seller offer attachment.",
      status: "ACTIVE",
      ownerSellerId: null,
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
        ...createListingProduct({
          id: "cproduct0001",
          title: "Astra X1 Pro"
        })
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

  it("creates a seller-owned catalog product and first offer", async () => {
    const { notificationsService, prisma, service, tx } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.sellerProductListing.findFirst.mockResolvedValue(null);
    tx.category.findFirst.mockResolvedValue({
      id: "category-1",
      name: "Desk Lamps"
    });
    tx.brand.findUnique.mockResolvedValue(null);
    tx.brand.create.mockResolvedValue({
      id: "brand-1"
    });
    tx.product.findUnique.mockResolvedValue(null);
    tx.product.create.mockResolvedValue({
      id: "product-9"
    });
    tx.productVariant.create.mockResolvedValue({
      id: "variant-9"
    });
    tx.sellerProductListing.create.mockResolvedValue({
      id: "listing-9",
      isActive: true
    });
    prisma.sellerProductListing.findUniqueOrThrow.mockResolvedValue({
      id: "listing-9",
      sellerId: "seller-1",
      productId: "product-9",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 3,
      sellerSku: "NST-LAMP-001",
      updatedAt: new Date("2026-03-17T11:00:00.000Z"),
      prices: [
        {
          amount: 129900,
          compareAtAmount: 149900,
          currency: "RON",
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-17T11:00:00.000Z")
        }
      ],
      product: {
        ...createListingProduct({
          id: "product-9",
          slug: "atlas-reader-desk-lamp-north-star-electronics",
          title: "Atlas Reader Desk Lamp",
          description:
            "A compact reading lamp with USB-C power, adjustable warmth, and a weighted desk base.",
          categoryId: "category-1",
          ownerSellerId: "seller-1",
          brand: {
            name: "Lumio"
          },
          category: {
            name: "Desk Lamps"
          }
        })
      },
      variant: {
        title: "Black / USB-C"
      },
      inventoryItem: {
        id: "inventory-9",
        onHand: 14,
        reserved: 0,
        safetyStock: 2
      }
    });

    const result = await service.createCatalogProduct(viewer, {
      title: "Atlas Reader Desk Lamp",
      description:
        "A compact reading lamp with USB-C power, adjustable warmth, and a weighted desk base.",
      categoryId: "categc000001",
      brandName: "Lumio",
      variantTitle: "Black / USB-C",
      sellerSku: "NST-LAMP-001",
      leadTimeDays: 3,
      priceAmount: 129900,
      compareAtAmount: 149900,
      onHand: 14,
      safetyStock: 2,
      isActive: true,
      note: "First seller-created catalog product."
    });

    expect(result.listingId).toBe("listing-9");
    expect(result.title).toBe("Atlas Reader Desk Lamp");
    expect(tx.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          ownerSellerId: "seller-1"
        })
      })
    );
    expect(tx.sellerProductListing.create).toHaveBeenCalled();
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
  });

  it("rejects attaching an offer to another seller's owned product", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.product.findUnique.mockResolvedValue({
      id: "cproduct0002",
      slug: "artisan-desk-lamp-south-harbor",
      title: "Artisan Desk Lamp",
      description: "Seller-owned product already created by another merchant.",
      status: "ACTIVE",
      ownerSellerId: "seller-2",
      brand: {
        name: "South Harbor"
      },
      category: {
        name: "Desk Lamps"
      },
      media: [],
      variants: [],
      listings: []
    });

    await expect(
      service.createListing(viewer, {
        productId: "cproduct0002",
        sellerSku: "NST-CROSS-LIST",
        leadTimeDays: 2,
        priceAmount: 199900,
        compareAtAmount: null,
        onHand: 4,
        safetyStock: 0,
        isActive: true
      })
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("updates seller-owned catalog product content", async () => {
    const { notificationsService, prisma, service, tx } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.product.findUnique.mockResolvedValue({
      id: "product-9",
      ownerSellerId: "seller-1",
      media: [
        {
          id: "media-1",
          url: "https://example.com/old-hero.jpg",
          altText: "Old hero",
          sortOrder: 0
        }
      ],
      listings: [
        {
          id: "listing-9",
          status: "ACTIVE",
          isActive: true
        }
      ]
    });
    tx.category.findFirst.mockResolvedValue({
      id: "categc000002",
      name: "Ambient Lighting"
    });
    tx.brand.findUnique.mockResolvedValue({
      id: "brand-2"
    });
    prisma.sellerProductListing.findFirstOrThrow.mockResolvedValue({
      id: "listing-9",
      sellerId: "seller-1",
      productId: "product-9",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 3,
      sellerSku: "NST-LAMP-001",
      updatedAt: new Date("2026-03-17T12:15:00.000Z"),
      prices: [
        {
          amount: 129900,
          compareAtAmount: 149900,
          currency: "RON",
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-17T11:00:00.000Z")
        }
      ],
      product: {
        ...createListingProduct({
          id: "product-9",
          slug: "atlas-reader-desk-lamp-north-star-electronics",
          title: "Atlas Reader Desk Lamp Mk II",
          description:
            "Updated seller-owned product content with refreshed copy and imagery.",
          categoryId: "categc000002",
          ownerSellerId: "seller-1",
          brand: {
            name: "Lumio"
          },
          category: {
            name: "Ambient Lighting"
          },
          media: [
            {
              url: "https://example.com/new-hero.jpg",
              altText: "Atlas Reader Desk Lamp Mk II"
            }
          ]
        })
      },
      variant: {
        title: "Black / USB-C"
      },
      inventoryItem: {
        id: "inventory-9",
        onHand: 14,
        reserved: 0,
        safetyStock: 2
      }
    });

    const result = await service.updateCatalogProduct(viewer, "product-9", {
      title: "Atlas Reader Desk Lamp Mk II",
      description:
        "Updated seller-owned product content with refreshed copy and imagery.",
      categoryId: "categc000002",
      brandName: "Lumio",
      imageUrl: "https://example.com/new-hero.jpg",
      imageAlt: "Atlas Reader Desk Lamp Mk II",
      note: "Copy refresh after merchant QA."
    });

    expect(result.title).toBe("Atlas Reader Desk Lamp Mk II");
    expect(tx.product.update).toHaveBeenCalled();
    expect(tx.productMedia.update).toHaveBeenCalled();
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
  });

  it("rejects catalog-content edits on platform-owned products", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.product.findUnique.mockResolvedValue({
      id: "cproduct0001",
      ownerSellerId: null,
      media: [],
      listings: [
        {
          id: "listing-3",
          status: "ACTIVE",
          isActive: true
        }
      ]
    });

    await expect(
      service.updateCatalogProduct(viewer, "cproduct0001", {
        title: "Shared catalog edit",
        description:
          "This should be rejected because shared marketplace products remain platform-managed.",
        categoryId: "categc000001",
        brandName: "Astra",
        imageUrl: null,
        imageAlt: null
      })
    ).rejects.toBeInstanceOf(ConflictException);
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
        ...createListingProduct()
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
        ...createListingProduct()
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

  it("reactivates archived seller-owned offers", async () => {
    const { prisma, service, tx } = createService();
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
      status: "ARCHIVED",
      isActive: false,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:00:00.000Z"),
      prices: [],
      product: {
        ...createListingProduct()
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
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 2,
      sellerSku: "NST-AX1P-256",
      updatedAt: new Date("2026-03-17T08:15:00.000Z"),
      prices: [],
      product: {
        ...createListingProduct()
      },
      variant: null,
      inventoryItem: {
        id: "inventory-1",
        onHand: 12,
        reserved: 0,
        safetyStock: 1
      }
    });

    const result = await service.reactivateListing(viewer, "listing-1");

    expect(result.status).toBe("ACTIVE");
    expect(result.isActive).toBe(true);
    expect(tx.sellerProductListing.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "listing-1"
        },
        data: expect.objectContaining({
          status: "ACTIVE",
          isActive: true
        })
      })
    );
  });

  it("deletes archived seller-owned products without live dependencies", async () => {
    const { notificationsService, prisma, service, tx } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.product.findUnique.mockResolvedValue({
      id: "product-9",
      title: "Atlas Reader Desk Lamp",
      ownerSellerId: "seller-1",
      orderItems: [],
      listings: [
        {
          id: "listing-9",
          status: "ARCHIVED",
          sellerSku: "NST-LAMP-001",
          cartItems: [],
          inventoryItem: {
            reserved: 0
          }
        }
      ]
    });

    const result = await service.deleteCatalogProduct(viewer, "product-9");

    expect(result).toEqual({
      deletedProductId: "product-9",
      deletedListingCount: 1
    });
    expect(tx.product.delete).toHaveBeenCalledWith({
      where: {
        id: "product-9"
      }
    });
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
  });

  it("rejects deleting seller-owned products before the offer is archived", async () => {
    const { prisma, service } = createService();
    prisma.seller.findUnique.mockResolvedValue({
      id: "seller-1",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      status: "ACTIVE"
    });
    prisma.product.findUnique.mockResolvedValue({
      id: "product-9",
      title: "Atlas Reader Desk Lamp",
      ownerSellerId: "seller-1",
      orderItems: [],
      listings: [
        {
          id: "listing-9",
          status: "ACTIVE",
          sellerSku: "NST-LAMP-001",
          cartItems: [],
          inventoryItem: {
            reserved: 0
          }
        }
      ]
    });

    await expect(
      service.deleteCatalogProduct(viewer, "product-9")
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
