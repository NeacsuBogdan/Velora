import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchProjectionListing } from "../search/search.helpers";
import { CartService } from "./cart.service";

function createListing(): SearchProjectionListing {
  return {
    id: "clisting001",
    sellerId: "cseller001",
    productId: "cproduct001",
    variantId: "cvariant001",
    sellerSku: "seed-north-star-electronics-nordwave-edge-s",
    status: "ACTIVE",
    isActive: true,
    leadTimeDays: 1,
    createdAt: new Date("2026-03-10T08:00:00.000Z"),
    updatedAt: new Date("2026-03-10T08:00:00.000Z"),
    seller: {
      id: "cseller001",
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      legalName: "North Star Electronics SRL",
      contactEmail: "seller@velora.local",
      status: "ACTIVE",
      ownerUserId: null,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    variant: {
      id: "cvariant001",
      sku: "VEL-000002",
      title: "Azure 128 GB",
      attributes: {
        color: "Azure",
        storage: "128 GB"
      },
      isDefault: true,
      productId: "cproduct001",
      createdAt: new Date(),
      updatedAt: new Date()
    },
    inventoryItem: {
      id: "cinventory001",
      listingId: "clisting001",
      onHand: 12,
      reserved: 0,
      safetyStock: 0,
      updatedAt: new Date()
    },
    prices: [
      {
        id: "cprice001",
        listingId: "clisting001",
        amount: 329900,
        currency: "RON",
        compareAtAmount: 359900,
        startsAt: null,
        endsAt: null,
        createdAt: new Date("2026-03-10T08:00:00.000Z")
      }
    ],
    product: {
      id: "cproduct001",
      slug: "nordwave-edge-s",
      title: "NordWave Edge S",
      description: "Balanced flagship phone with fast charging.",
      status: "ACTIVE",
      brandId: "cbrand001",
      categoryId: "ccategory002",
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      updatedAt: new Date("2026-03-10T08:00:00.000Z"),
      brand: {
        id: "cbrand001",
        slug: "nordwave",
        name: "NordWave",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      category: {
        id: "ccategory002",
        slug: "phones",
        name: "Phones",
        description: "Smartphones and companion devices.",
        parentId: "ccategory001",
        sortOrder: 1,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        parent: {
          id: "ccategory001",
          slug: "electronics",
          name: "Electronics",
          description: "Consumer electronics and connected devices.",
          parentId: null,
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      },
      media: [
        {
          id: "cmedia001",
          productId: "cproduct001",
          storageKey: "catalog/nordwave-edge-s/hero.png",
          url: "https://placehold.co/800x800/png?text=NordWave+Edge+S",
          altText: "NordWave Edge S hero",
          kind: "IMAGE",
          sortOrder: 1,
          createdAt: new Date()
        }
      ],
      attributes: [
        {
          id: "cattribute001",
          productId: "cproduct001",
          name: "Display",
          value: "6.1 inch OLED",
          createdAt: new Date()
        }
      ]
    }
  } as unknown as SearchProjectionListing;
}

describe("CartService", () => {
  const inventoryService = {
    releaseExpiredReservationsWithinTransaction: vi.fn(),
    releaseReservationsForCheckoutSessionWithinTransaction: vi.fn()
  };

  const tx = {
    cart: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    cartItem: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn()
    },
    checkoutSession: {
      findMany: vi.fn(),
      findFirst: vi.fn()
    },
    sellerProductListing: {
      findUnique: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    )
  };

  const promotionsService = {
    repriceCartWithinTransaction: vi.fn()
  };

  let cartService: CartService;

  beforeEach(() => {
    vi.clearAllMocks();
    cartService = new CartService(
      prisma as never,
      inventoryService as never,
      promotionsService as never
    );
    inventoryService.releaseExpiredReservationsWithinTransaction.mockResolvedValue({
      releasedReservations: 0,
      inventoryItemsAdjusted: 0
    });
    inventoryService.releaseReservationsForCheckoutSessionWithinTransaction.mockResolvedValue(
      {
        releasedReservations: 0,
        inventoryItemsAdjusted: 0
      }
    );
    promotionsService.repriceCartWithinTransaction.mockResolvedValue({
      subtotal: 659800,
      discountTotal: 0,
      total: 659800,
      currency: "RON",
      couponCode: null,
      discounts: []
    });
  });

  it("adds a catalog listing to the active cart and recalculates totals", async () => {
    const listing = createListing();
    const itemRecord = {
      id: "item-1",
      cartId: "cart-1",
      listingId: "clisting001",
      quantity: 2,
      unitPrice: 329900,
      currency: "RON",
      titleSnapshot: "NordWave Edge S",
      sellerSnapshot: "North Star Electronics",
      metadata: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      listing
    };

    tx.cart.findFirst.mockResolvedValue({
      id: "cart-1",
      userId: "user-1",
      status: "ACTIVE",
      currency: "RON",
      subtotal: 659800,
      discountTotal: 0,
      total: 659800,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    tx.checkoutSession.findMany.mockResolvedValue([]);
    tx.checkoutSession.findFirst.mockResolvedValue(null);
    tx.sellerProductListing.findUnique.mockResolvedValue(listing);
    tx.cartItem.findUnique.mockResolvedValue(null);
    tx.cartItem.upsert.mockResolvedValue(itemRecord);
    tx.cartItem.findMany.mockResolvedValue([itemRecord]);
    tx.cart.findUnique.mockResolvedValue({
      id: "cart-1",
      status: "ACTIVE",
      currency: "RON",
      subtotal: 659800,
      discountTotal: 0,
      total: 659800,
      items: [itemRecord]
    });

    const result = await cartService.addItem(
      {
        user: {
          id: "user-1",
          email: "customer@velora.local",
          firstName: "Demo",
          lastName: "Customer",
          roles: [
            {
              code: "CUSTOMER",
              name: "Customer"
            }
          ]
        },
        guestCartToken: null
      },
      {
        listingId: "clisting001",
        quantity: 2
      }
    );

    expect(tx.cartItem.upsert).toHaveBeenCalled();
    expect(promotionsService.repriceCartWithinTransaction).toHaveBeenCalledWith(
      tx,
      "cart-1"
    );
    expect(result.itemCount).toBe(2);
    expect(result.items[0]?.canFulfill).toBe(true);
    expect(result.totals.total.amount).toBe(659800);
  });
});
