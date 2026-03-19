import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type PromotionType } from "@prisma/client";
import {
  domainOverviewSchema,
  promotionRuleConfigurationSchema,
  promotionSummarySchema,
  upsertSellerPromotionRequestSchema,
  upsertPromotionRequestSchema,
  type AuthenticatedUser,
  type UpsertSellerPromotionRequest
} from "@velora/contracts";

import { parseWithSchema } from "../../common/zod";
import { PlatformCacheService } from "../platform-cache/platform-cache.service";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";
import { OpenSearchService } from "../search/opensearch.service";
import {
  evaluatePromotions
} from "./promotion-engine";
import {
  findActivePromotionRecords,
  normalizePromotionCandidates,
  promotionReadInclude,
  type PromotionRecord
} from "./promotion-read-models";
import {
  pricingSnapshotSchema,
  type PricingSnapshot
} from "./pricing.helpers";
import { PrismaService } from "../database/prisma.service";

type DatabaseClient = PrismaService | Prisma.TransactionClient;
const sellerPromotionPriority = 300;

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

type CartPricingRecord = Prisma.CartGetPayload<typeof cartPricingInclude>;

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PlatformCacheService,
    private readonly openSearchService: OpenSearchService
  ) {}

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
      include: promotionReadInclude.include,
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

  async listSellerPromotions(sellerId: string) {
    const promotions = await this.prisma.promotion.findMany({
      where: {
        ownerSellerId: sellerId
      },
      include: promotionReadInclude.include,
      orderBy: [
        {
          isActive: "desc"
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
    this.validateFundingConfiguration(
      input.fundingSource,
      input.sellerFundingSharePercent ?? null
    );
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
          fundingSource: input.fundingSource,
          sellerFundingSharePercent:
            input.fundingSource === "SHARED"
              ? input.sellerFundingSharePercent ?? null
              : null,
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
        include: promotionReadInclude.include
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
        include: promotionReadInclude.include
      });
    });

    await this.invalidatePromotionReadModels();

    return this.mapPromotionSummary(promotion);
  }

  async updatePromotion(
    viewer: AuthenticatedUser,
    promotionId: string,
    rawInput: unknown
  ) {
    const input = parseWithSchema(upsertPromotionRequestSchema, rawInput);
    this.validatePromotionRule(input.type, input.rule.configuration);
    this.validateFundingConfiguration(
      input.fundingSource,
      input.sellerFundingSharePercent ?? null
    );
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
          fundingSource: input.fundingSource,
          sellerFundingSharePercent:
            input.fundingSource === "SHARED"
              ? input.sellerFundingSharePercent ?? null
              : null,
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
        include: promotionReadInclude.include
      });
    });

    await this.invalidatePromotionReadModels();

    return this.mapPromotionSummary(promotion);
  }

  async createSellerPromotion(
    viewer: AuthenticatedUser,
    sellerId: string,
    rawInput: unknown
  ) {
    const input = parseWithSchema(upsertSellerPromotionRequestSchema, rawInput);
    this.validateDateRange(input.startsAt ?? null, input.endsAt ?? null);
    const configuration = this.buildSellerPromotionConfiguration(input);
    this.validatePromotionRule(
      input.type,
      configuration as unknown as Prisma.JsonValue
    );
    const targetedListingIds = await this.resolveSellerPromotionTargetListingIds(
      sellerId,
      configuration,
      true
    );
    await this.ensureNoOverlappingSellerPromotion(
      sellerId,
      targetedListingIds,
      input.startsAt ?? null,
      input.endsAt ?? null,
      null,
      input.isActive
    );

    const promotion = await this.prisma.$transaction(async (tx) => {
      const createdPromotion = await tx.promotion.create({
        data: {
          ownerSellerId: sellerId,
          name: input.name,
          code: null,
          description: input.description,
          type: input.type,
          fundingSource: "SELLER",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: sellerPromotionPriority,
          isActive: input.isActive,
          startsAt: input.startsAt ? new Date(input.startsAt) : null,
          endsAt: input.endsAt ? new Date(input.endsAt) : null,
          rules: {
            create: {
              name: this.buildSellerPromotionRuleName(input.name, input.type),
              configuration: configuration as Prisma.InputJsonValue
            }
          }
        },
        include: promotionReadInclude.include
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PROMOTION",
          entityId: createdPromotion.id,
          action: "SELLER_PROMOTION_CREATED",
          details: {
            sellerId,
            listingIds: targetedListingIds,
            categorySlugs: configuration.categorySlugs ?? [],
            type: input.type,
            fundingSource: "SELLER"
          }
        }
      });

      return createdPromotion;
    });

    await this.invalidatePromotionReadModels();

    return this.mapPromotionSummary(promotion);
  }

  async updateSellerPromotion(
    viewer: AuthenticatedUser,
    sellerId: string,
    promotionId: string,
    rawInput: unknown
  ) {
    const input = parseWithSchema(upsertSellerPromotionRequestSchema, rawInput);
    this.validateDateRange(input.startsAt ?? null, input.endsAt ?? null);
    const configuration = this.buildSellerPromotionConfiguration(input);
    this.validatePromotionRule(
      input.type,
      configuration as unknown as Prisma.JsonValue
    );
    const targetedListingIds = await this.resolveSellerPromotionTargetListingIds(
      sellerId,
      configuration,
      true
    );
    await this.ensureNoOverlappingSellerPromotion(
      sellerId,
      targetedListingIds,
      input.startsAt ?? null,
      input.endsAt ?? null,
      promotionId,
      input.isActive
    );

    const promotion = await this.prisma.$transaction(async (tx) => {
      const existingPromotion = await tx.promotion.findFirst({
        where: {
          id: promotionId,
          ownerSellerId: sellerId
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
          code: null,
          description: input.description,
          type: input.type,
          fundingSource: "SELLER",
          sellerFundingSharePercent: null,
          stackingMode: "STACKABLE",
          priority: sellerPromotionPriority,
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
          name: this.buildSellerPromotionRuleName(input.name, input.type),
          configuration: configuration as Prisma.InputJsonValue
        }
      });

      await tx.coupon.deleteMany({
        where: {
          promotionId
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PROMOTION",
          entityId: promotionId,
          action: "SELLER_PROMOTION_UPDATED",
          details: {
            sellerId,
            listingIds: targetedListingIds,
            categorySlugs: configuration.categorySlugs ?? [],
            type: input.type,
            fundingSource: "SELLER"
          }
        }
      });

      return tx.promotion.findUniqueOrThrow({
        where: {
          id: promotionId
        },
        include: promotionReadInclude.include
      });
    });

    await this.invalidatePromotionReadModels();

    return this.mapPromotionSummary(promotion);
  }

  async deleteSellerPromotion(
    viewer: AuthenticatedUser,
    sellerId: string,
    promotionId: string
  ) {
    await this.prisma.$transaction(async (tx) => {
      const existingPromotion = await tx.promotion.findFirst({
        where: {
          id: promotionId,
          ownerSellerId: sellerId
        },
        select: {
          id: true,
          name: true
        }
      });

      if (!existingPromotion) {
        throw new NotFoundException(`Promotion ${promotionId} was not found.`);
      }

      await tx.coupon.deleteMany({
        where: {
          promotionId
        }
      });

      await tx.promotion.delete({
        where: {
          id: promotionId
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PROMOTION",
          entityId: promotionId,
          action: "SELLER_PROMOTION_DELETED",
          details: {
            sellerId,
            name: existingPromotion.name
          }
        }
      });
    });

    await this.invalidatePromotionReadModels();

    return {
      deletedPromotionId: promotionId
    };
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
    const promotions = await findActivePromotionRecords(tx, now);

    const pricing = evaluatePromotions({
      currency: cart.currency,
      couponCode: normalizeCouponCode(cart.couponCode),
      lines: cart.items.map((item) => {
        const projection = buildSearchDocument(item.listing);

        return {
          listingId: item.listingId,
          sellerId: item.listing.sellerId,
          productId: projection.productId,
          title: projection.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          categorySlug: projection.category?.slug ?? null,
          categoryPath: projection.category?.path.map((entry) => entry.slug) ?? []
        };
      }),
      promotions: normalizePromotionCandidates(promotions, now)
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
        description: discount.description,
        fundingSource: discount.fundingSource,
        sellerFundedAmount: {
          amount: discount.sellerFundedAmount,
          currency: cart.currency
        },
        platformFundedAmount: {
          amount: discount.platformFundedAmount,
          currency: cart.currency
        },
        allocations: discount.allocations
      }))
    });
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

  private validateFundingConfiguration(
    fundingSource: "PLATFORM" | "SELLER" | "SHARED",
    sellerFundingSharePercent: number | null
  ) {
    if (fundingSource === "SHARED") {
      if (
        sellerFundingSharePercent === null ||
        sellerFundingSharePercent < 1 ||
        sellerFundingSharePercent > 99
      ) {
        throw new BadRequestException(
          "Shared promotions require a seller funding share between 1 and 99 percent."
        );
      }

      return;
    }

    if (sellerFundingSharePercent !== null && sellerFundingSharePercent !== undefined) {
      throw new BadRequestException(
        "Seller funding share is only valid for shared promotions."
      );
    }
  }

  private async invalidatePromotionReadModels() {
    this.openSearchService.invalidateProjection();
    await this.cacheService.deleteByPrefix(["catalog:", "search:query:"]);
  }

  private buildSellerPromotionConfiguration(
    input: UpsertSellerPromotionRequest
  ) {
    return {
      ...(input.listingId ? { listingIds: [input.listingId] } : {}),
      ...(input.categorySlug ? { categorySlugs: [input.categorySlug] } : {}),
      ...(input.type === "PERCENTAGE"
        ? { percentage: input.percentage }
        : {}),
      ...(input.type === "FIXED_AMOUNT"
        ? { amount: input.amount }
        : {}),
      ...(input.type === "CATEGORY_DISCOUNT"
        ? {
            ...(input.percentage !== undefined
              ? { percentage: input.percentage }
              : {}),
            ...(input.amount !== undefined ? { amount: input.amount } : {})
          }
        : {}),
      ...(input.type === "BUY_X_GET_Y"
        ? {
            buyQuantity: input.buyQuantity,
            getQuantity: input.getQuantity
          }
        : {})
    };
  }

  private buildSellerPromotionRuleName(
    name: string,
    type: UpsertSellerPromotionRequest["type"]
  ) {
    switch (type) {
      case "PERCENTAGE":
        return `${name} percentage rule`;
      case "FIXED_AMOUNT":
        return `${name} fixed rule`;
      case "CATEGORY_DISCOUNT":
        return `${name} category rule`;
      case "BUY_X_GET_Y":
        return `${name} bundle rule`;
      default:
        return `${name} rule`;
    }
  }

  private async assertSellerOwnedListings(sellerId: string, listingIds: string[]) {
    const uniqueListingIds = [...new Set(listingIds)];
    const listings = await this.prisma.sellerProductListing.findMany({
      where: {
        id: {
          in: uniqueListingIds
        },
        sellerId,
        status: {
          not: "ARCHIVED"
        }
      },
      select: {
        id: true
      }
    });

    if (listings.length !== uniqueListingIds.length) {
      throw new BadRequestException(
        "Seller promotions can only target offers owned by the active merchant."
      );
    }
  }

  private async ensureNoOverlappingSellerPromotion(
    sellerId: string,
    listingIds: string[],
    startsAt: string | null,
    endsAt: string | null,
    ignorePromotionId: string | null,
    isActive: boolean
  ) {
    if (!isActive) {
      return;
    }

    const promotions = await this.prisma.promotion.findMany({
      where: {
        ownerSellerId: sellerId,
        isActive: true,
        ...(ignorePromotionId
          ? {
              id: {
                not: ignorePromotionId
              }
            }
          : {})
      },
      include: promotionReadInclude.include
    });
    const existingPromotionTargetEntries = await Promise.all(
      promotions.map(async (promotion) => {
        const rule = promotion.rules[0];

        if (!rule) {
          return [promotion.id, [] as string[]] as const;
        }

        const configuration = promotionRuleConfigurationSchema.parse(
          rule.configuration ?? {}
        );
        const targetedListingIds =
          await this.resolveSellerPromotionTargetListingIds(
            sellerId,
            configuration,
            false
          );

        return [promotion.id, targetedListingIds] as const;
      })
    );
    const existingPromotionTargetMap = new Map(existingPromotionTargetEntries);

    const hasConflict = promotions.some((promotion) => {
      const targetedListingIds = existingPromotionTargetMap.get(promotion.id) ?? [];

      if (!targetedListingIds.some((listingId) => listingIds.includes(listingId))) {
        return false;
      }

      return dateRangesOverlap(
        startsAt,
        endsAt,
        promotion.startsAt?.toISOString() ?? null,
        promotion.endsAt?.toISOString() ?? null
      );
    });

    if (hasConflict) {
      throw new ConflictException(
        "Another active seller campaign already overlaps this offer and time window."
      );
    }
  }

  private async resolveSellerPromotionTargetListingIds(
    sellerId: string,
    configuration: {
      listingIds?: string[];
      categorySlugs?: string[];
    },
    validateOwnership: boolean
  ) {
    const listingIds = [...new Set(configuration.listingIds ?? [])];

    if (listingIds.length > 0) {
      if (validateOwnership) {
        await this.assertSellerOwnedListings(sellerId, listingIds);
      }

      return listingIds;
    }

    const categorySlugs = [...new Set(configuration.categorySlugs ?? [])];

    if (categorySlugs.length === 0) {
      throw new BadRequestException(
        "Seller campaigns require either a listing target or a category target."
      );
    }

    const scopedListings = await this.collectSellerScopedCategoryListings(sellerId);
    const allowedCategorySlugs = new Set(
      scopedListings.flatMap((listing) => listing.categoryPathSlugs)
    );

    if (
      validateOwnership &&
      categorySlugs.some((categorySlug) => !allowedCategorySlugs.has(categorySlug))
    ) {
      throw new BadRequestException(
        "Seller category campaigns can only target categories already present in the active merchant catalog."
      );
    }

    return scopedListings
      .filter((listing) =>
        listing.categoryPathSlugs.some((categorySlug) =>
          categorySlugs.includes(categorySlug)
        )
      )
      .map((listing) => listing.id);
  }

  private async collectSellerScopedCategoryListings(sellerId: string) {
    const [categories, listings] = await Promise.all([
      this.prisma.category.findMany({
        select: {
          id: true,
          slug: true,
          parentId: true
        }
      }),
      this.prisma.sellerProductListing.findMany({
        where: {
          sellerId,
          status: {
            not: "ARCHIVED"
          }
        },
        select: {
          id: true,
          product: {
            select: {
              categoryId: true
            }
          }
        }
      })
    ]);

    const categoryMap = new Map(
      categories.map((category) => [category.id, category])
    );

    return listings.map((listing) => ({
      id: listing.id,
      categoryPathSlugs: this.buildCategoryPathSlugs(
        listing.product.categoryId,
        categoryMap
      )
    }));
  }

  private buildCategoryPathSlugs(
    categoryId: string | null,
    categoryMap: Map<
      string,
      {
        id: string;
        slug: string;
        parentId: string | null;
      }
    >
  ) {
    if (!categoryId) {
      return [];
    }

    const path: string[] = [];
    let current = categoryMap.get(categoryId);

    while (current) {
      path.unshift(current.slug);
      current = current.parentId ? categoryMap.get(current.parentId) : undefined;
    }

    return path;
  }

  private mapPromotionSummary(promotion: PromotionRecord) {
    return promotionSummarySchema.parse({
      promotionId: promotion.id,
      name: promotion.name,
      code: promotion.code ?? null,
      description: promotion.description,
      type: promotion.type,
      fundingSource: promotion.fundingSource,
      sellerFundingSharePercent: promotion.sellerFundingSharePercent ?? null,
      stackingMode: promotion.stackingMode,
      priority: promotion.priority,
      isActive: promotion.isActive,
      startsAt: promotion.startsAt?.toISOString() ?? null,
      endsAt: promotion.endsAt?.toISOString() ?? null,
      ownerSeller: promotion.ownerSeller
        ? {
            sellerId: promotion.ownerSeller.id,
            slug: promotion.ownerSeller.slug,
            displayName: promotion.ownerSeller.displayName
          }
        : null,
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

function dateRangesOverlap(
  leftStartsAt: string | null,
  leftEndsAt: string | null,
  rightStartsAt: string | null,
  rightEndsAt: string | null
) {
  const leftStart = leftStartsAt
    ? new Date(leftStartsAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const leftEnd = leftEndsAt
    ? new Date(leftEndsAt).getTime()
    : Number.POSITIVE_INFINITY;
  const rightStart = rightStartsAt
    ? new Date(rightStartsAt).getTime()
    : Number.NEGATIVE_INFINITY;
  const rightEnd = rightEndsAt
    ? new Date(rightEndsAt).getTime()
    : Number.POSITIVE_INFINITY;

  return leftStart <= rightEnd && rightStart <= leftEnd;
}
