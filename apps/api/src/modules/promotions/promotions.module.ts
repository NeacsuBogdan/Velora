import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { domainOverviewSchema } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";

@Injectable()
class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [promotionCount, couponCount, activePromotionCount] =
      await Promise.all([
        this.prisma.promotion.count(),
        this.prisma.coupon.count(),
        this.prisma.promotion.count({
          where: { isActive: true }
        })
      ]);

    return domainOverviewSchema.parse({
      scope: "promotions",
      metrics: {
        promotions: promotionCount,
        coupons: couponCount,
        activePromotions: activePromotionCount
      },
      notes: ["Public pricing metadata snapshot."]
    });
  }
}

@Controller("promotions")
class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get("overview")
  getOverview() {
    return this.promotionsService.getOverview();
  }
}

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsService]
})
export class PromotionsModule {}
