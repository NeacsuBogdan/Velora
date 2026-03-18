import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import {
  catalogNavigationSchema,
  categoryDetailSchema,
  domainOverviewSchema,
  productDetailSchema
} from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import { PlatformCacheService } from "../platform-cache/platform-cache.service";
import { MerchandisingPricingService } from "../search/merchandising-pricing.service";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";

const productDetailInclude =
  Prisma.validator<Prisma.ProductDefaultArgs>()({
    include: {
      brand: true,
      category: {
        include: {
          parent: true
        }
      },
      media: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      attributes: {
        orderBy: {
          createdAt: "asc"
        }
      },
      specifications: {
        orderBy: [{ groupName: "asc" }, { label: "asc" }]
      },
      variants: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

type CategoryRecord = {
  id: string;
  name: string;
  slug: string;
  description: string;
  parentId: string | null;
  sortOrder: number;
};

@Injectable()
export class CatalogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PlatformCacheService,
    private readonly configService: ConfigService,
    private readonly merchandisingPricingService: MerchandisingPricingService
  ) {}

  private buildChildrenMap(categories: CategoryRecord[]) {
    const childrenByParentId = new Map<string | null, CategoryRecord[]>();

    for (const category of categories) {
      const bucket = childrenByParentId.get(category.parentId) ?? [];
      bucket.push(category);
      childrenByParentId.set(category.parentId, bucket);
    }

    for (const bucket of childrenByParentId.values()) {
      bucket.sort(
        (left, right) =>
          left.sortOrder - right.sortOrder || left.name.localeCompare(right.name)
      );
    }

    return childrenByParentId;
  }

  private collectBranchIds(
    categoryId: string,
    childrenByParentId: Map<string | null, CategoryRecord[]>
  ): string[] {
    const branchIds = [categoryId];
    const queue = [...(childrenByParentId.get(categoryId) ?? [])];

    while (queue.length > 0) {
      const nextCategory = queue.shift();

      if (!nextCategory) {
        continue;
      }

      branchIds.push(nextCategory.id);
      queue.push(...(childrenByParentId.get(nextCategory.id) ?? []));
    }

    return branchIds;
  }

  private buildProductCountMap(
    categories: CategoryRecord[],
    products: Array<{ id: string; categoryId: string | null }>
  ) {
    const childrenByParentId = this.buildChildrenMap(categories);
    const directCounts = new Map<string, number>();

    for (const product of products) {
      if (!product.categoryId) {
        continue;
      }

      directCounts.set(
        product.categoryId,
        (directCounts.get(product.categoryId) ?? 0) + 1
      );
    }

    const countByCategoryId = new Map<string, number>();

    const countProducts = (categoryId: string): number => {
      if (countByCategoryId.has(categoryId)) {
        return countByCategoryId.get(categoryId) ?? 0;
      }

      const direct = directCounts.get(categoryId) ?? 0;
      const childTotal = (childrenByParentId.get(categoryId) ?? []).reduce<number>(
        (sum, child) => sum + countProducts(child.id),
        0
      );

      countByCategoryId.set(categoryId, direct + childTotal);
      return direct + childTotal;
    };

    for (const category of categories) {
      countProducts(category.id);
    }

    return countByCategoryId;
  }

  private buildBreadcrumbs(
    category: CategoryRecord,
    categoriesById: Map<string, CategoryRecord>
  ) {
    const path = [];
    let currentCategory: CategoryRecord | undefined = category;

    while (currentCategory) {
      path.unshift({
        slug: currentCategory.slug,
        name: currentCategory.name
      });

      currentCategory = currentCategory.parentId
        ? categoriesById.get(currentCategory.parentId)
        : undefined;
    }

    return path;
  }

  async getOverview() {
    return this.cacheService.remember(
      "catalog:overview",
      this.getCatalogTtl(),
      async () => {
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
    );
  }

  async getNavigation() {
    return this.cacheService.remember(
      "catalog:navigation",
      this.getCatalogTtl(),
      async () => {
        const [categories, products] = await Promise.all([
          this.prisma.category.findMany({
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              slug: true,
              description: true,
              parentId: true,
              sortOrder: true
            },
            orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
          }),
          this.prisma.product.findMany({
            where: { status: "ACTIVE" },
            select: {
              id: true,
              categoryId: true
            }
          })
        ]);

        const childrenByParentId = this.buildChildrenMap(categories);
        const productCountByCategoryId = this.buildProductCountMap(categories, products);
        const roots = childrenByParentId.get(null) ?? [];

        return catalogNavigationSchema.parse({
          categories: roots.map((category) => ({
            slug: category.slug,
            name: category.name,
            description: category.description,
            productCount: productCountByCategoryId.get(category.id) ?? 0,
            children: (childrenByParentId.get(category.id) ?? []).map((child) => ({
              slug: child.slug,
              name: child.name,
              description: child.description,
              productCount: productCountByCategoryId.get(child.id) ?? 0
            }))
          })),
          featuredCategories: roots
            .slice()
            .sort(
              (left, right) =>
                (productCountByCategoryId.get(right.id) ?? 0) -
                (productCountByCategoryId.get(left.id) ?? 0)
            )
            .slice(0, 4)
            .map((category) => ({
              slug: category.slug,
              name: category.name,
              description: category.description,
              productCount: productCountByCategoryId.get(category.id) ?? 0
            }))
        });
      }
    );
  }

  async getCategoryDetail(slug: string) {
    return this.cacheService.remember(
      `catalog:category:${slug}`,
      this.getCatalogTtl(),
      async () => {
        const categories = await this.prisma.category.findMany({
          where: { isActive: true },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            parentId: true,
            sortOrder: true
          },
          orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
        });
        const category = categories.find((entry) => entry.slug === slug);

        if (!category) {
          throw new NotFoundException(`Category ${slug} was not found.`);
        }

        const childrenByParentId = this.buildChildrenMap(categories);
        const categoriesById = new Map(categories.map((entry) => [entry.id, entry]));
        const branchIds = this.collectBranchIds(category.id, childrenByParentId);
        const [productCount, brandCount, sellerCount, allProducts] = await Promise.all([
          this.prisma.product.count({
            where: {
              status: "ACTIVE",
              categoryId: {
                in: branchIds
              }
            }
          }),
          this.prisma.brand.count({
            where: {
              products: {
                some: {
                  status: "ACTIVE",
                  categoryId: {
                    in: branchIds
                  }
                }
              }
            }
          }),
          this.prisma.seller.count({
            where: {
              listings: {
                some: {
                  isActive: true,
                  status: "ACTIVE",
                  product: {
                    status: "ACTIVE",
                    categoryId: {
                      in: branchIds
                    }
                  }
                }
              }
            }
          }),
          this.prisma.product.findMany({
            where: {
              status: "ACTIVE"
            },
            select: {
              id: true,
              categoryId: true
            }
          })
        ]);
        const productCountByCategoryId = this.buildProductCountMap(categories, allProducts);

        return categoryDetailSchema.parse({
          slug: category.slug,
          name: category.name,
          description: category.description,
          breadcrumbs: this.buildBreadcrumbs(category, categoriesById),
          childCategories: (childrenByParentId.get(category.id) ?? []).map((child) => ({
            slug: child.slug,
            name: child.name,
            description: child.description,
            productCount: productCountByCategoryId.get(child.id) ?? 0
          })),
          metrics: {
            products: productCount,
            brands: brandCount,
            sellers: sellerCount
          }
        });
      }
    );
  }

  async getProductDetail(slug: string) {
    return this.cacheService.remember(
      `catalog:product:${slug}`,
      this.getProductTtl(),
      async () => {
        const product = await this.prisma.product.findUnique({
          where: { slug },
          include: productDetailInclude.include
        });

        if (!product || product.status !== "ACTIVE") {
          throw new NotFoundException(`Product ${slug} was not found.`);
        }

        const [activeListings, relatedListings] = await Promise.all([
          this.prisma.sellerProductListing.findMany({
            where: {
              productId: product.id,
              isActive: true,
              status: "ACTIVE"
            },
            include: searchProjectionListingInclude.include
          }),
          this.prisma.sellerProductListing.findMany({
            where: {
              isActive: true,
              status: "ACTIVE",
              product: {
                status: "ACTIVE",
                categoryId: product.categoryId,
                id: {
                  not: product.id
                }
              }
            },
            take: 12,
            include: searchProjectionListingInclude.include
          })
        ]);
        const categoryPath = product.category
          ? [
              ...(product.category.parent
                ? [
                    {
                      slug: product.category.parent.slug,
                      name: product.category.parent.name
                    }
                  ]
                : []),
              {
                slug: product.category.slug,
                name: product.category.name
              }
            ]
          : [];
        const relatedDocuments =
          await this.merchandisingPricingService.applyToDocuments(
            relatedListings.map((listing) => buildSearchDocument(listing))
          );
        const activeOfferDocuments =
          await this.merchandisingPricingService.applyToDocuments(
            activeListings.map((listing) => buildSearchDocument(listing))
          );
        const relatedProducts = [...new Map(
          relatedDocuments.map((item) => [item.productId, item])
        ).values()]
          .slice(0, 4);

        return productDetailSchema.parse({
          productId: product.id,
          slug: product.slug,
          title: product.title,
          description: product.description,
          brand: product.brand
            ? {
                slug: product.brand.slug,
                name: product.brand.name
              }
            : null,
          category: product.category
            ? {
                slug: product.category.slug,
                name: product.category.name
              }
            : null,
          breadcrumbs: categoryPath,
          gallery: product.media.map((media) => ({
            url: media.url,
            altText: media.altText
          })),
          highlights: product.attributes.map((attribute) => ({
            name: attribute.name,
            value: attribute.value
          })),
          variants: product.variants.map((variant) => ({
            id: variant.id,
            sku: variant.sku,
            title: variant.title,
            isDefault: variant.isDefault,
            attributes:
              typeof variant.attributes === "object" &&
              variant.attributes !== null &&
              !Array.isArray(variant.attributes)
                ? Object.entries(variant.attributes).map(([name, value]) => ({
                    name,
                    value: String(value)
                  }))
                : []
          })),
          offers: activeListings
            .map((listing) => {
              const projection =
                activeOfferDocuments.find((entry) => entry.listingId === listing.id) ??
                buildSearchDocument(listing);

              return {
                listingId: projection.listingId,
                seller: projection.seller,
                pricing: projection.pricing,
                availability: projection.availability,
                sellerSku: listing.sellerSku
              };
            })
            .sort(
              (left, right) =>
                left.pricing.current.amount - right.pricing.current.amount
            ),
          specifications: product.specifications.reduce<
            Array<{ title: string; items: Array<{ label: string; value: string }> }>
          >((groups, specification) => {
            const group = groups.find(
              (entry) => entry.title === specification.groupName
            );

            if (group) {
              group.items.push({
                label: specification.label,
                value: specification.value
              });
              return groups;
            }

            groups.push({
              title: specification.groupName,
              items: [
                {
                  label: specification.label,
                  value: specification.value
                }
              ]
            });

            return groups;
          }, []),
          relatedProducts
        });
      }
    );
  }

  private getCatalogTtl() {
    return this.configService.get<number>("CACHE_TTL_CATALOG_SECONDS") ?? 120;
  }

  private getProductTtl() {
    return this.configService.get<number>("CACHE_TTL_PRODUCT_SECONDS") ?? 90;
  }
}
