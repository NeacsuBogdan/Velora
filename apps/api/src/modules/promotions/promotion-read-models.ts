import { Prisma } from "@prisma/client";
import {
  promotionRuleConfigurationSchema,
  type PromotionFundingSource
} from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import { type PricingPromotionCandidate } from "./promotion-engine";

type DatabaseClient = PrismaService | Prisma.TransactionClient;

export const promotionReadInclude = Prisma.validator<Prisma.PromotionDefaultArgs>()({
  include: {
    ownerSeller: {
      select: {
        id: true,
        slug: true,
        displayName: true
      }
    },
    rules: {
      orderBy: {
        createdAt: "asc"
      }
    },
    coupons: {
      orderBy: {
        createdAt: "asc"
      }
    }
  }
});

export type PromotionRecord = Prisma.PromotionGetPayload<typeof promotionReadInclude>;

export async function findActivePromotionRecords(
  tx: DatabaseClient,
  now: Date
) {
  return tx.promotion.findMany({
    where: {
      isActive: true,
      AND: [
        {
          OR: [{ startsAt: null }, { startsAt: { lte: now } }]
        },
        {
          OR: [{ endsAt: null }, { endsAt: { gte: now } }]
        }
      ]
    },
    include: promotionReadInclude.include
  });
}

export function normalizePromotionCandidates(
  promotions: PromotionRecord[],
  now: Date
): PricingPromotionCandidate[] {
  return promotions.flatMap((promotion): PricingPromotionCandidate[] => {
    const rule = promotion.rules[0];

    if (!rule) {
      return [];
    }

    const configuration = promotionRuleConfigurationSchema.parse(
      rule.configuration ?? {}
    );
    const baseCandidate = {
      promotionId: promotion.id,
      name: promotion.name,
      description: promotion.description,
      type: promotion.type,
      fundingSource: promotion.fundingSource as PromotionFundingSource,
      sellerFundingSharePercent: promotion.sellerFundingSharePercent ?? null,
      stackingMode: promotion.stackingMode,
      priority: promotion.priority,
      configuration
    };
    const activeCoupons = promotion.coupons.filter((coupon) =>
      isCouponActive(coupon, now)
    );

    if (activeCoupons.length === 0) {
      return [
        {
          ...baseCandidate,
          couponCode: null
        }
      ];
    }

    return activeCoupons.map((coupon) => ({
      ...baseCandidate,
      couponCode: coupon.code
    }));
  });
}

function isCouponActive(
  coupon: PromotionRecord["coupons"][number],
  now: Date
) {
  if (coupon.status !== "ACTIVE") {
    return false;
  }

  const startsAtValid = coupon.startsAt ? coupon.startsAt <= now : true;
  const endsAtValid = coupon.endsAt ? coupon.endsAt >= now : true;
  const usageValid = coupon.usageLimit ? coupon.usedCount < coupon.usageLimit : true;

  return startsAtValid && endsAtValid && usageValid;
}
