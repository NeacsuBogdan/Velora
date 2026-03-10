import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { domainOverviewSchema } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";

@Injectable()
class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview() {
    const [categoryCount, productCount, listingCount, categories] =
      await Promise.all([
        this.prisma.category.count(),
        this.prisma.product.count(),
        this.prisma.sellerProductListing.count({
          where: { isActive: true }
        }),
        this.prisma.category.findMany({
          take: 3,
          orderBy: { sortOrder: "asc" }
        })
      ]);

    return domainOverviewSchema.parse({
      scope: "catalog",
      metrics: {
        categories: categoryCount,
        products: productCount,
        activeListings: listingCount
      },
      notes: categories.map((category) => `${category.name} (${category.slug})`)
    });
  }
}

@Controller("catalog")
class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get("overview")
  getOverview() {
    return this.catalogService.getOverview();
  }
}

@Module({
  controllers: [CatalogController],
  providers: [CatalogService]
})
export class CatalogModule {}
