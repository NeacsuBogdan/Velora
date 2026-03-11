import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type PromotionType } from "@prisma/client";
import {
  domainOverviewSchema,
  promotionRuleConfigurationSchema,
  promotionSummarySchema,
  upsertPromotionRequestSchema,
  type AuthenticatedUser
} from "@velora/contracts";

import { parseWithSchema } from "../../common/zod";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";
import {
  evaluatePromotions,
  type PricingPromotionCandidate
} from "./promotion-engine";
import {
  pricingSnapshotSchema,
  type PricingSnapshot
} from "./pricing.helpers";
import { PrismaService } from "../database/prisma.service";

type DatabaseClient = PrismaService | Prisma.TransactionClient;

const promotionInclude = Prisma.validator<Prisma.PromotionDefaultArgs>()({
  include: {
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

const cartPricingInclude = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      orderBy: {
        createdAt: "asc"
      },
      include: {
        listing: {
          include: searchProjectionListingInclude.include
        }
      }
    }
  }
});

type PromotionRecord = Prisma.PromotionGetPayload<typeof promotionInclude>;
type CartPricingRecord = Prisma.CartGetPayload<typeof cartPricingInclude>;

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [promotionCount, couponCount, activePromotionCount] =
      await Promise.all([
        this.prisma.promotion.count(),
        this.prisma.coupon.count(),
        this.prisma.promotion.count({
          where: {
            isActive: true
          }
        })
      ]);

    return domainOverviewSchema.parse({
      scope: "promotions",
      metrics: {
        promotions: promotionCount,
        coupons: couponCount,
        activePromotions: activePromotionCount
      },
      notes: [
        "Deterministic promotion evaluation now powers cart repricing and checkout snapshots."
      ]
    });
  }

  async listPromotions() {
    const promotions = await this.prisma.promotion.findMany({
      include: promotionInclude.include,
      orderBy: [
        {
          priority: "asc"
        },
        {
          updatedAt: "desc"
        }
      ]
    });

    return promotions.map((promotion) => this.mapPromotionSummary(promotion));
  }

  async createPromotion(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = parseWithSchema(upsertPromotionRequestSchema, rawInput);
    this.validatePromotionRule(input.type, input.rule.configuration);
    this.validateDateRange(input.startsAt ?? null, input.endsAt ?? null);
    input.coupons.forEach((coupon) =>
      this.validateDateRange(coupon.startsAt ?? null, coupon.endsAt ?? null)
    );

    const promotion = await this.prisma.$transaction(async (tx) => {
      const createdPromotion = await tx.promotion.create({
        data: {
          name: input.name,
          code: normalizeCouponCode(input.code),
          description: input.description,
          type: input.type,
          stackingMode: input.stackingMode,
          priority: input.priority,
          isActive: input.isActive,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          rules: {
            create: {
              name: input.rule.name,
              configuration: input.rule.configuration as Prisma.InputJsonValue
            }
          }
        },
        include: promotionInclude.include
      });

      for (const coupon of input.coupons) {
        await tx.coupon.create({
          data: {
            promotionId: createdPromotion.id,
            code: normalizeCouponCode(coupon.code)!,
            status: coupon.status,
            usageLimit: coupon.usageLimit ?? null,
            startsAt: coupon.startsAt ? new Date(coupon.startsAt) : null,
            endsAt: coupon.endsAt ? new Date(coupon.endsAt) : null
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PROMOTION",
          entityId: createdPromotion.id,
          action: "PROMOTION_CREATED",
          details: {
            code: createdPromotion.code,
            type: createdPromotion.type
          }
        }
      });

      return tx.promotion.findUniqueOrThrow({
        where: {
          id: createdPromotion.id
        },
        include: promotionInclude.include
      });
    });

    return this.mapPromotionSummary(promotion);
  }

  async updatePromotion(
    viewer: AuthenticatedUser,
    promotionId: string,
    rawInput: unknown
  ) {
    const input = parseWithSchema(upsertPromotionRequestSchema, rawInput);
    this.validatePromotionRule(input.type, input.rule.configuration);
    this.validateDateRange(input.startsAt ?? null, input.endsAt ?? null);
    input.coupons.forEach((coupon) =>
      this.validateDateRange(coupon.startsAt ?? null, coupon.endsAt ?? null)
    );

    const promotion = await this.prisma.$transaction(async (tx) => {
      const existingPromotion = await tx.promotion.findUnique({
        where: {
          id: promotionId
        }
      });

      if (!existingPromotion) {
        throw new NotFoundException(`Promotion ${promotionId} was not found.`);
      }

      await tx.promotion.update({
        where: {
          id: promotionId
        },
        data: {
          name: input.name,
          code: normalizeCouponCode(input.code),
          description: input.description,
          type: input.type,
          stackingMode: input.stackingMode,
          priority: input.priority,
          isActive: input.isActive,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null
        }
      });

      await tx.promotionRule.deleteMany({
        where: {
          promotionId
        }
      });

      await tx.promotionRule.create({
        data: {
          promotionId,
          name: input.rule.name,
          configuration: input.rule.configuration as Prisma.InputJsonValue
        }
      });

      const couponCodes = input.coupons.map((coupon) => normalizeCouponCode(coupon.code)!);

      await tx.coupon.deleteMany({
        where: {
          promotionId,
          code: {
            notIn: couponCodes
          }
        }
      });

      for (const coupon of input.coupons) {
        await tx.coupon.upsert({
          where: {
            code: normalizeCouponCode(coupon.code)!
          },
          update: {
            promotionId,
            status: coupon.status,
            usageLimit: coupon.usageLimit ?? null,
            startsAt: coupon.startsAt ? new Date(coupon.startsAt) : null,
            endsAt: coupon.endsAt ? new Date(coupon.endsAt) : null
          },
          create: {
            promotionId,
            code: normalizeCouponCode(coupon.code)!,
            status: coupon.status,
            usageLimit: coupon.usageLimit ?? null,
            startsAt: coupon.startsAt ? new Date(coupon.startsAt) : null,
            endsAt: coupon.endsAt ? new Date(coupon.endsAt) : null
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PROMOTION",
          entityId: promotionId,
          action: "PROMOTION_UPDATED",
          details: {
            code: normalizeCouponCode(input.code),
            type: input.type
          }
        }
      });

      return tx.promotion.findUniqueOrThrow({
        where: {
          id: promotionId
        },
        include: promotionInclude.include
      });
    });

    return this.mapPromotionSummary(promotion);
  }

  async repriceCartWithinTransaction(
    tx: DatabaseClient,
    cartId: string
  ): Promise<PricingSnapshot> {
    const pricing = await this.calculateCartPricingWithinTransaction(tx, cartId);

    await tx.cart.update({
      where: {
        id: cartId
      },
      data: {
        subtotal: pricing.subtotal,
        discountTotal: pricing.discountTotal,
        total: pricing.total
      }
    });

    return pricing;
  }

  async calculateCartPricingWithinTransaction(
    tx: DatabaseClient,
    cartId: string
  ): Promise<PricingSnapshot> {
    const cart = await tx.cart.findUnique({
      where: {
        id: cartId
      },
      include: cartPricingInclude.include
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found.`);
    }

    return this.calculatePricingForCartRecord(tx, cart);
  }

  private async calculatePricingForCartRecord(
    tx: DatabaseClient,
    cart: CartPricingRecord
  ): Promise<PricingSnapshot> {
    const now = new Date();
    const promotions = await tx.promotion.findMany({
      where: {
        isActive: true,
        AND: [
          {
            OR: [
              { startsAt: null },
              { startsAt: { lte: now } }
            ]
          },
          {
            OR: [
              { endsAt: null },
              { endsAt: { gte: now } }
            ]
          }
        ]
      },
      include: promotionInclude.include
    });

    const pricing = evaluatePromotions({
      currency: cart.currency,
      couponCode: normalizeCouponCode(cart.couponCode),
      lines: cart.items.map((item) => {
        const projection = buildSearchDocument(item.listing);

        return {
          listingId: item.listingId,
          productId: projection.productId,
          title: projection.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          categorySlug: projection.category?.slug ?? null,
          categoryPath: projection.category?.path.map((entry) => entry.slug) ?? []
        };
      }),
      promotions: this.normalizePromotionCandidates(promotions, now)
    });

    return pricingSnapshotSchema.parse({
      subtotal: pricing.subtotal,
      discountTotal: pricing.discountTotal,
      total: pricing.total,
      currency: cart.currency,
      couponCode: normalizeCouponCode(cart.couponCode),
      discounts: pricing.discounts.map((discount) => ({
        promotionId: discount.promotionId,
        couponCode: discount.couponCode,
        label: discount.label,
        amount: {
          amount: discount.amount,
          currency: cart.currency
        },
        description: discount.description
      }))
    });
  }

  private normalizePromotionCandidates(
    promotions: PromotionRecord[],
    now: Date
  ): PricingPromotionCandidate[] {
    return promotions.flatMap(
      (promotion): PricingPromotionCandidate[] => {
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
        stackingMode: promotion.stackingMode,
        priority: promotion.priority,
        configuration
      };

      const activeCoupons = promotion.coupons.filter((coupon) =>
        this.isCouponActive(coupon, now)
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
      }
    );
  }

  private isCouponActive(
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

  private validatePromotionRule(
    type: PromotionType,
    configuration: Prisma.JsonValue
  ) {
    const parsed = promotionRuleConfigurationSchema.parse(configuration);

    switch (type) {
      case "PERCENTAGE":
        if (!parsed.percentage) {
          throw new BadRequestException(
            "Percentage promotions require a percentage rule value."
          );
        }
        return;
      case "FIXED_AMOUNT":
        if (!parsed.amount) {
          throw new BadRequestException(
            "Fixed amount promotions require an amount rule value."
          );
        }
        return;
      case "CART_THRESHOLD":
        if (
          parsed.thresholdAmount === undefined ||
          (!parsed.amount && !parsed.percentage)
        ) {
          throw new BadRequestException(
            "Cart threshold promotions require a threshold and a discount value."
          );
        }
        return;
      case "CATEGORY_DISCOUNT":
        if (
          !parsed.categorySlugs?.length ||
          (!parsed.amount && !parsed.percentage)
        ) {
          throw new BadRequestException(
            "Category discount promotions require category slugs and a discount value."
          );
        }
        return;
      case "BUY_X_GET_Y":
        if (
          !parsed.buyQuantity ||
          !parsed.getQuantity ||
          (!parsed.categorySlugs?.length && !parsed.listingIds?.length)
        ) {
          throw new BadRequestException(
            "Buy X get Y promotions require scope plus buy/get quantities."
          );
        }
        return;
      default:
        return;
    }
  }

  private validateDateRange(
    startsAt: string | null,
    endsAt: string | null
  ) {
    if (startsAt && endsAt && new Date(startsAt) > new Date(endsAt)) {
      throw new BadRequestException("The promotion window is invalid.");
    }
  }

  private mapPromotionSummary(promotion: PromotionRecord) {
    return promotionSummarySchema.parse({
      promotionId: promotion.id,
      name: promotion.name,
      code: promotion.code ?? null,
      description: promotion.description,
      type: promotion.type,
      stackingMode: promotion.stackingMode,
      priority: promotion.priority,
      isActive: promotion.isActive,
      startsAt: promotion.startsAt?.toISOString() ?? null,
      endsAt: promotion.endsAt?.toISOString() ?? null,
      rules: promotion.rules.map((rule) => ({
        ruleId: rule.id,
        name: rule.name,
        configuration: promotionRuleConfigurationSchema.parse(
          rule.configuration ?? {}
        )
      })),
      coupons: promotion.coupons.map((coupon) => ({
        couponId: coupon.id,
        code: coupon.code,
        status: coupon.status,
        usageLimit: coupon.usageLimit ?? null,
        usedCount: coupon.usedCount,
        startsAt: coupon.startsAt?.toISOString() ?? null,
        endsAt: coupon.endsAt?.toISOString() ?? null
      })),
      updatedAt: promotion.updatedAt.toISOString()
    });
  }
}

function normalizeCouponCode(value: string | null | undefined) {
  return value ? value.trim().toUpperCase() : null;
}
