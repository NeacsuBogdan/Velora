import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@velora/contracts";

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

const viewer: AuthenticatedUser = {
  id: "seller-user-1",
  email: "seller@velora.local",
  firstName: "North",
  lastName: "Star",
  roles: [
    {
      code: "SELLER",
      name: "Seller"
    }
  ]
};
const ownedListingId = "cksellerlisting000000000001";
const foreignListingId = "cksellerlisting000000000999";

describe("PromotionsService", () => {
  const prisma = {
    $transaction: vi.fn(),
    category: {
      findMany: vi.fn()
    },
    promotion: {
      findMany: vi.fn()
    },
    sellerProductListing: {
      findMany: vi.fn()
    }
  };
  const cacheService = {
    deleteByPrefix: vi.fn()
  };
  const openSearchService = {
    invalidateProjection: vi.fn()
  };
  let promotionsService: PromotionsService;

  beforeEach(() => {
    vi.clearAllMocks();
    promotionsService = new PromotionsService(
      prisma as never,
      cacheService as never,
      openSearchService as never
    );
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
            fundingSource: "PLATFORM",
            sellerFundingSharePercent: null,
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
        description: "Coupon-backed launch discount",
        fundingSource: "PLATFORM",
        sellerFundedAmount: {
          amount: 0,
          currency: "RON"
        },
        platformFundedAmount: {
          amount: 32990,
          currency: "RON"
        },
        allocations: [
          {
            listingId: "clisting001",
            amount: 32990
          }
        ]
      }
    ]);
  });

  it("creates a seller-funded listing campaign for an owned offer", async () => {
    prisma.sellerProductListing.findMany.mockResolvedValue([{ id: ownedListingId }]);
    prisma.promotion.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        promotion: {
          create: vi.fn().mockResolvedValue({
            id: "promotion-seller-1",
            name: "Seller weekend",
            code: null,
            description: "Merchant-funded launch reduction",
            type: "PERCENTAGE",
            fundingSource: "SELLER",
            sellerFundingSharePercent: null,
            stackingMode: "STACKABLE",
            priority: 300,
            isActive: true,
            startsAt: null,
            endsAt: null,
            createdAt: new Date("2026-03-18T09:00:00.000Z"),
            updatedAt: new Date("2026-03-18T09:00:00.000Z"),
            ownerSellerId: "seller-1",
            ownerSeller: {
              id: "seller-1",
              slug: "north-star-electronics",
              displayName: "North Star Electronics"
            },
            rules: [
              {
                id: "rule-seller-1",
                promotionId: "promotion-seller-1",
                name: "Seller weekend percentage rule",
                configuration: {
                  percentage: 8,
                  listingIds: [ownedListingId]
                },
                createdAt: new Date("2026-03-18T09:00:00.000Z")
              }
            ],
            coupons: []
          })
        },
        auditLog: {
          create: vi.fn().mockResolvedValue(undefined)
        }
      })
    );

    const promotion = await promotionsService.createSellerPromotion(viewer, "seller-1", {
      name: "Seller weekend",
      description: "Merchant-funded launch reduction",
      type: "PERCENTAGE",
      listingId: ownedListingId,
      percentage: 8,
      isActive: true,
      startsAt: null,
      endsAt: null
    });

    expect(promotion.fundingSource).toBe("SELLER");
    expect(promotion.ownerSeller?.sellerId).toBe("seller-1");
    expect(promotion.rules[0]?.configuration.listingIds).toEqual([ownedListingId]);
    expect(cacheService.deleteByPrefix).toHaveBeenCalledWith([
      "catalog:",
      "search:query:"
    ]);
    expect(openSearchService.invalidateProjection).toHaveBeenCalled();
  });

  it("creates a seller-funded category campaign for the active merchant catalog", async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: "ccategory001",
        slug: "electronics",
        parentId: null
      },
      {
        id: "ccategory002",
        slug: "phones",
        parentId: "ccategory001"
      }
    ]);
    prisma.sellerProductListing.findMany.mockResolvedValue([
      {
        id: ownedListingId,
        product: {
          categoryId: "ccategory002"
        }
      },
      {
        id: "cksellerlisting000000000002",
        product: {
          categoryId: "ccategory002"
        }
      }
    ]);
    prisma.promotion.findMany.mockResolvedValue([]);
    prisma.$transaction.mockImplementation(async (callback) =>
      callback({
        promotion: {
          create: vi.fn().mockResolvedValue({
            id: "promotion-seller-category-1",
            name: "Seller electronics week",
            code: null,
            description: "Merchant-funded category markdown",
            type: "CATEGORY_DISCOUNT",
            fundingSource: "SELLER",
            sellerFundingSharePercent: null,
            stackingMode: "STACKABLE",
            priority: 300,
            isActive: true,
            startsAt: null,
            endsAt: null,
            createdAt: new Date("2026-03-18T09:00:00.000Z"),
            updatedAt: new Date("2026-03-18T09:00:00.000Z"),
            ownerSellerId: "seller-1",
            ownerSeller: {
              id: "seller-1",
              slug: "north-star-electronics",
              displayName: "North Star Electronics"
            },
            rules: [
              {
                id: "rule-seller-category-1",
                promotionId: "promotion-seller-category-1",
                name: "Seller electronics week category rule",
                configuration: {
                  categorySlugs: ["electronics"],
                  percentage: 6
                },
                createdAt: new Date("2026-03-18T09:00:00.000Z")
              }
            ],
            coupons: []
          })
        },
        auditLog: {
          create: vi.fn().mockResolvedValue(undefined)
        }
      })
    );

    const promotion = await promotionsService.createSellerPromotion(viewer, "seller-1", {
      name: "Seller electronics week",
      description: "Merchant-funded category markdown",
      type: "CATEGORY_DISCOUNT",
      categorySlug: "electronics",
      percentage: 6,
      isActive: true,
      startsAt: null,
      endsAt: null
    });

    expect(promotion.type).toBe("CATEGORY_DISCOUNT");
    expect(promotion.rules[0]?.configuration.categorySlugs).toEqual([
      "electronics"
    ]);
    expect(promotion.rules[0]?.configuration.percentage).toBe(6);
  });

  it("rejects seller campaigns that target another merchant's offer", async () => {
    prisma.sellerProductListing.findMany.mockResolvedValue([]);

    await expect(
      promotionsService.createSellerPromotion(viewer, "seller-1", {
        name: "Foreign listing",
        description: "Should fail on ownership validation.",
        type: "FIXED_AMOUNT",
        listingId: foreignListingId,
        amount: 1500,
        isActive: true,
        startsAt: null,
        endsAt: null
      })
    ).rejects.toThrow(
      "Seller promotions can only target offers owned by the active merchant."
    );
  });

  it("rejects overlapping active seller campaigns on the same offer", async () => {
    prisma.sellerProductListing.findMany.mockResolvedValue([{ id: ownedListingId }]);
    prisma.promotion.findMany.mockResolvedValue([
      {
        id: "promotion-seller-existing",
        name: "Existing campaign",
        code: null,
        description: "Already active on the same listing.",
        type: "PERCENTAGE",
        fundingSource: "SELLER",
        sellerFundingSharePercent: null,
        stackingMode: "STACKABLE",
        priority: 300,
        isActive: true,
        startsAt: new Date("2026-03-18T09:00:00.000Z"),
        endsAt: new Date("2026-03-20T09:00:00.000Z"),
        createdAt: new Date("2026-03-18T09:00:00.000Z"),
        updatedAt: new Date("2026-03-18T09:00:00.000Z"),
        ownerSellerId: "seller-1",
        ownerSeller: {
          id: "seller-1",
          slug: "north-star-electronics",
          displayName: "North Star Electronics"
        },
        rules: [
          {
            id: "rule-existing",
            promotionId: "promotion-seller-existing",
            name: "Existing rule",
            configuration: {
              percentage: 5,
              listingIds: [ownedListingId]
            },
            createdAt: new Date("2026-03-18T09:00:00.000Z")
          }
        ],
        coupons: []
      }
    ]);

    await expect(
      promotionsService.createSellerPromotion(viewer, "seller-1", {
        name: "Conflicting campaign",
        description: "Overlaps the same offer and time range.",
        type: "FIXED_AMOUNT",
        listingId: ownedListingId,
        amount: 1000,
        isActive: true,
        startsAt: "2026-03-19T09:00:00.000Z",
        endsAt: "2026-03-21T09:00:00.000Z"
      })
    ).rejects.toThrow(
      "Another active seller campaign already overlaps this offer and time window."
    );
  });

  it("rejects seller category campaigns outside the merchant catalog", async () => {
    prisma.category.findMany.mockResolvedValue([
      {
        id: "ccategory001",
        slug: "electronics",
        parentId: null
      }
    ]);
    prisma.sellerProductListing.findMany.mockResolvedValue([
      {
        id: ownedListingId,
        product: {
          categoryId: "ccategory001"
        }
      }
    ]);

    await expect(
      promotionsService.createSellerPromotion(viewer, "seller-1", {
        name: "Foreign category",
        description: "Should fail on category ownership validation.",
        type: "CATEGORY_DISCOUNT",
        categorySlug: "home-living",
        percentage: 12,
        isActive: true,
        startsAt: null,
        endsAt: null
      })
    ).rejects.toThrow(
      "Seller category campaigns can only target categories already present in the active merchant catalog."
    );
  });
});
