import { describe, expect, it } from "vitest";

import { evaluatePromotions } from "./promotion-engine";

describe("promotion engine", () => {
  const baseInput = {
    currency: "RON",
    couponCode: null,
    lines: [
      {
        listingId: "listing-1",
        productId: "product-1",
        title: "NordWave Edge S",
        quantity: 2,
        unitPrice: 200000,
        categorySlug: "phones",
        categoryPath: ["electronics", "phones"]
      },
      {
        listingId: "listing-2",
        productId: "product-2",
        title: "NovaSound Mini",
        quantity: 1,
        unitPrice: 100000,
        categorySlug: "audio",
        categoryPath: ["electronics", "audio"]
      }
    ],
    promotions: []
  };

  it("stacks percentage and cart-threshold discounts in deterministic order", () => {
    const result = evaluatePromotions({
      ...baseInput,
      promotions: [
        {
          promotionId: "promo-1",
          name: "10% catalog boost",
          description: "Auto percentage discount",
          type: "PERCENTAGE",
          fundingSource: "PLATFORM",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: 10,
          couponCode: null,
          configuration: {
            percentage: 10
          }
        },
        {
          promotionId: "promo-2",
          name: "Threshold bonus",
          description: "Spend over 4000 RON",
          type: "CART_THRESHOLD",
          fundingSource: "PLATFORM",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: 20,
          couponCode: null,
          configuration: {
            thresholdAmount: 400000,
            amount: 25000
          }
        }
      ]
    });

    expect(result.subtotal).toBe(500000);
    expect(result.discountTotal).toBe(75000);
    expect(result.total).toBe(425000);
    expect(result.discounts.map((discount) => discount.label)).toEqual([
      "10% catalog boost",
      "Threshold bonus"
    ]);
    expect(result.discounts[0]?.platformFundedAmount).toBe(50000);
  });

  it("lets an exclusive promotion override stackable promotions", () => {
    const result = evaluatePromotions({
      ...baseInput,
      promotions: [
        {
          promotionId: "promo-1",
          name: "10% catalog boost",
          description: "Stackable percentage discount",
          type: "PERCENTAGE",
          fundingSource: "PLATFORM",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: 5,
          couponCode: null,
          configuration: {
            percentage: 10
          }
        },
        {
          promotionId: "promo-2",
          name: "Weekend exclusive",
          description: "Exclusive fixed discount",
          type: "FIXED_AMOUNT",
          fundingSource: "SELLER",
          sellerFundingSharePercent: null,
          stackingMode: "EXCLUSIVE",
          priority: 50,
          couponCode: null,
          configuration: {
            amount: 80000
          }
        }
      ]
    });

    expect(result.discountTotal).toBe(80000);
    expect(result.discounts).toHaveLength(1);
    expect(result.discounts[0]?.label).toBe("Weekend exclusive");
    expect(result.discounts[0]?.sellerFundedAmount).toBe(80000);
  });

  it("applies category discounts only to matching lines", () => {
    const result = evaluatePromotions({
      ...baseInput,
      promotions: [
        {
          promotionId: "promo-1",
          name: "Audio focus",
          description: "Category promotion",
          type: "CATEGORY_DISCOUNT",
          fundingSource: "PLATFORM",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: 10,
          couponCode: null,
          configuration: {
            categorySlugs: ["audio"],
            percentage: 20
          }
        }
      ]
    });

    expect(result.discountTotal).toBe(20000);
    expect(result.total).toBe(480000);
  });

  it("calculates buy-x-get-y discounts using the cheapest eligible units", () => {
    const result = evaluatePromotions({
      currency: "RON",
      couponCode: null,
      lines: [
        {
          listingId: "listing-1",
          productId: "product-1",
          title: "Pack A",
          quantity: 2,
          unitPrice: 5000,
          categorySlug: "accessories",
          categoryPath: ["electronics", "accessories"]
        },
        {
          listingId: "listing-2",
          productId: "product-2",
          title: "Pack B",
          quantity: 1,
          unitPrice: 7000,
          categorySlug: "accessories",
          categoryPath: ["electronics", "accessories"]
        }
      ],
      promotions: [
        {
          promotionId: "promo-1",
          name: "Buy two get one",
          description: "Accessory bundle",
          type: "BUY_X_GET_Y",
          fundingSource: "SHARED",
          sellerFundingSharePercent: 40,
          stackingMode: "STACKABLE",
          priority: 10,
          couponCode: null,
          configuration: {
            categorySlugs: ["accessories"],
            buyQuantity: 2,
            getQuantity: 1
          }
        }
      ]
    });

    expect(result.discountTotal).toBe(5000);
    expect(result.total).toBe(12000);
    expect(result.discounts[0]?.sellerFundedAmount).toBe(2000);
    expect(result.discounts[0]?.platformFundedAmount).toBe(3000);
  });

  it("supports product-scoped fixed amount promotions", () => {
    const result = evaluatePromotions({
      ...baseInput,
      promotions: [
        {
          promotionId: "promo-1",
          name: "Launch discount",
          description: "Scoped listing markdown",
          type: "FIXED_AMOUNT",
          fundingSource: "PLATFORM",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: 10,
          couponCode: null,
          configuration: {
            amount: 15000,
            listingIds: ["listing-2"]
          }
        }
      ]
    });

    expect(result.discountTotal).toBe(15000);
    expect(result.discounts[0]?.allocations).toEqual([
      {
        listingId: "listing-2",
        amount: 15000
      }
    ]);
  });
});
