import { Injectable } from "@nestjs/common";

import {
  evaluatePromotions,
  supportsMerchandisingDisplay
} from "../promotions/promotion-engine";
import {
  findActivePromotionRecords,
  normalizePromotionCandidates
} from "../promotions/promotion-read-models";
import { PrismaService } from "../database/prisma.service";
import { type SearchProjectionDocument } from "./search.helpers";

@Injectable()
export class MerchandisingPricingService {
  constructor(private readonly prisma: PrismaService) {}

  async applyToDocuments(
    documents: SearchProjectionDocument[],
    now = new Date()
  ): Promise<SearchProjectionDocument[]> {
    if (documents.length === 0) {
      return documents;
    }

    const promotionRecords = await findActivePromotionRecords(this.prisma, now);
    const promotions = normalizePromotionCandidates(promotionRecords, now).filter(
      supportsMerchandisingDisplay
    );

    if (promotions.length === 0) {
      return documents;
    }

    return documents.map((document) => {
      const baseAmount = document.pricing.current.amount;

      if (baseAmount <= 0) {
        return document;
      }

      const pricing = evaluatePromotions({
        currency: document.pricing.current.currency,
        couponCode: null,
        lines: [
          {
            listingId: document.listingId,
            productId: document.productId,
            title: document.title,
            quantity: 1,
            unitPrice: baseAmount,
            categorySlug: document.category?.slug ?? null,
            categoryPath: document.category?.path.map((entry) => entry.slug) ?? []
          }
        ],
        promotions
      });
      const discountedAmount = Math.max(baseAmount - pricing.discountTotal, 0);

      if (discountedAmount >= baseAmount) {
        return document;
      }

      const compareAtAmount = Math.max(
        document.pricing.compareAt?.amount ?? 0,
        baseAmount
      );

      return {
        ...document,
        pricing: {
          current: {
            amount: discountedAmount,
            currency: document.pricing.current.currency
          },
          compareAt: {
            amount: compareAtAmount,
            currency: document.pricing.current.currency
          },
          discountPercentage: calculateDiscountPercentage(
            discountedAmount,
            compareAtAmount
          )
        }
      };
    });
  }
}

function calculateDiscountPercentage(
  amount: number,
  compareAtAmount: number | null | undefined
) {
  if (!compareAtAmount || compareAtAmount <= amount) {
    return null;
  }

  return Math.round(((compareAtAmount - amount) / compareAtAmount) * 100);
}
