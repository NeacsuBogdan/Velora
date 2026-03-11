import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SearchProjectionListing } from "../search/search.helpers";
import { PromotionsService } from "./promotions.service";

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
      media: [],
      attributes: []
    }
  } as unknown as SearchProjectionListing;
}

describe("PromotionsService", () => {
  const prisma = {};
  let promotionsService: PromotionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    promotionsService = new PromotionsService(prisma as never);
  });

  it("builds a pricing snapshot that includes coupon-backed discounts", async () => {
    const tx = {
      cart: {
        findUnique: vi.fn().mockResolvedValue({
          id: "cart-1",
          currency: "RON",
          couponCode: "demo5",
          items: [
            {
              id: "item-1",
              listingId: "clisting001",
              quantity: 2,
              unitPrice: 329900,
              listing: createListing()
            }
          ]
        })
      },
      promotion: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "promotion-1",
            name: "Welcome 5%",
            description: "Coupon-backed launch discount",
            type: "PERCENTAGE",
            stackingMode: "STACKABLE",
            priority: 10,
            rules: [
              {
                id: "rule-1",
                promotionId: "promotion-1",
                name: "5 percent",
                configuration: {
                  percentage: 5
                },
                createdAt: new Date()
              }
            ],
            coupons: [
              {
                id: "coupon-1",
                promotionId: "promotion-1",
                code: "DEMO5",
                status: "ACTIVE",
                usageLimit: null,
                usedCount: 0,
                startsAt: null,
                endsAt: null,
                createdAt: new Date(),
                updatedAt: new Date()
              }
            ]
          }
        ])
      }
    };

    const pricing = await promotionsService.calculateCartPricingWithinTransaction(
      tx as never,
      "cart-1"
    );

    expect(pricing.couponCode).toBe("DEMO5");
    expect(pricing.discountTotal).toBe(32990);
    expect(pricing.total).toBe(626810);
    expect(pricing.discounts).toEqual([
      {
        promotionId: "promotion-1",
        couponCode: "DEMO5",
        label: "Welcome 5%",
        amount: {
          amount: 32990,
          currency: "RON"
        },
        description: "Coupon-backed launch discount"
      }
    ]);
  });
});
