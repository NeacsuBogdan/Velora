import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  adminCatalogOptionsSchema,
  adminDashboardSchema,
  adminOperationsOverviewSchema,
  triggerReindexRequestSchema,
  triggerReindexResponseSchema,
  updateAdminInventoryRequestSchema,
  updateAdminOrderStatusRequestSchema,
  updateAdminSellerRequestSchema,
  upsertAdminCategoryRequestSchema,
  upsertAdminProductRequestSchema,
  type AuthenticatedUser
} from "@velora/contracts";
import { z } from "zod";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { OpenSearchService } from "../search/opensearch.service";
import { SearchProjectionService } from "../search/search.service";
import {
  adminCustomerInclude,
  adminInventoryInclude,
  adminOrderInclude,
  adminProductInclude,
  adminSellerInclude,
  canTransitionOrderStatus,
  mapAdminAuditLogSummary,
  mapAdminCategorySummary,
  mapAdminCustomerSummary,
  mapAdminInventoryItem,
  mapAdminOrderDetail,
  mapAdminOrderSummary,
  mapAdminProductSummary,
  mapAdminReindexJobSummary,
  mapAdminSearchSyncLog,
  mapAdminSellerSummary,
  mapAdminWebhookDeliverySummary,
  normalizeOptionalString,
  selectPrimaryListing,
  slugify
} from "./admin.helpers";

const productQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
      z.string().max(120).optional()
    )
    .optional(),
  status: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value : undefined),
    z.enum(["DRAFT", "ACTIVE", "ARCHIVED"]).optional()
  )
});

const inventoryQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
      z.string().max(120).optional()
    )
    .optional(),
  lowStock: z.preprocess(
    (value) => value === true || value === "true",
    z.boolean().default(false)
  )
});

const ordersQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
      z.string().max(120).optional()
    )
    .optional(),
  status: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value : undefined),
    z
      .enum([
        "CREATED",
        "PAYMENT_PENDING",
        "PAID",
        "PROCESSING",
        "SHIPPED",
        "COMPLETED",
        "CANCELED",
        "REFUNDED"
      ])
      .optional()
  )
});

const customersQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
      z.string().max(120).optional()
    )
    .optional()
});

const sellersQuerySchema = z.object({
  q: z
    .preprocess(
      (value) => (typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined),
      z.string().max(120).optional()
    )
    .optional(),
  status: z.preprocess(
    (value) => (typeof value === "string" && value.trim().length > 0 ? value : undefined),
    z.enum(["PENDING", "ACTIVE", "SUSPENDED"]).optional()
  )
});

type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly inventoryService: InventoryService,
    private readonly projectionService: SearchProjectionService,
    private readonly openSearchService: OpenSearchService
  ) {}

  async getDashboard() {
    const [
      categories,
      products,
      activeListings,
      lowStockListings,
      pendingOrders,
      customers,
      sellers,
      activePromotions,
      openCheckouts
    ] = await Promise.all([
      this.prisma.category.count(),
      this.prisma.product.count(),
      this.prisma.sellerProductListing.count({
        where: {
          isActive: true,
          status: "ACTIVE",
          product: {
            status: "ACTIVE"
          }
        }
      }),
      this.prisma.inventoryItem.count({
        where: {
          onHand: {
            lte: 5
          }
        }
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: ["CREATED", "PAYMENT_PENDING", "PAID", "PROCESSING", "SHIPPED"]
          }
        }
      }),
      this.prisma.user.count({
        where: {
          roleAssignments: {
            some: {
              role: {
                code: "CUSTOMER"
              }
            }
          }
        }
      }),
      this.prisma.seller.count(),
      this.prisma.promotion.count({
        where: {
          isActive: true
        }
      }),
      this.prisma.checkoutSession.count({
        where: {
          status: {
            in: ["STARTED", "PAYMENT_PENDING"]
          }
        }
      })
    ]);

    return adminDashboardSchema.parse({
      generatedAt: new Date().toISOString(),
      metrics: {
        categories,
        products,
        activeListings,
        lowStockListings,
        pendingOrders,
        customers,
        sellers,
        activePromotions,
        openCheckouts
      },
      notes: [
        "Backoffice writes into the transactional source of truth and immediately refreshes search projections.",
        "Operational tools expose reindex, reservation cleanup, audit history, and webhook visibility from the same workspace."
      ]
    });
  }

  async getCatalogOptions() {
    const [categories, brands, sellers] = await Promise.all([
      this.prisma.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
      }),
      this.prisma.brand.findMany({
        orderBy: {
          name: "asc"
        }
      }),
      this.prisma.seller.findMany({
        orderBy: {
          displayName: "asc"
        }
      })
    ]);

    return adminCatalogOptionsSchema.parse({
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        parentId: category.parentId ?? null,
        isActive: category.isActive
      })),
      brands: brands.map((brand) => ({
        brandId: brand.id,
        name: brand.name,
        slug: brand.slug
      })),
      sellers: sellers.map((seller) => ({
        sellerId: seller.id,
        displayName: seller.displayName,
        status: seller.status
      }))
    });
  }

  async listCategories() {
    const categories = await this.prisma.category.findMany({
      include: {
        parent: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    return categories.map((category) => mapAdminCategorySummary(category));
  }

  async createCategory(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = upsertAdminCategoryRequestSchema.parse(rawInput);
    await this.ensureCategorySlugAvailable(input.slug);

    if (input.parentId) {
      await this.ensureCategoryParentAvailable(input.parentId);
    }

    const category = await this.prisma.category.create({
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        parentId: input.parentId ?? undefined,
        sortOrder: input.sortOrder,
        isActive: input.isActive
      },
      include: {
        parent: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      }
    });

    await this.auditService.record(viewer.id, "CATEGORY", category.id, "CATEGORY_CREATED", {
      slug: category.slug
    });

    return mapAdminCategorySummary(category);
  }

  async updateCategory(
    viewer: AuthenticatedUser,
    categoryId: string,
    rawInput: unknown
  ) {
    const input = upsertAdminCategoryRequestSchema.parse(rawInput);
    const existingCategory = await this.prisma.category.findUnique({
      where: {
        id: categoryId
      }
    });

    if (!existingCategory) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    await this.ensureCategorySlugAvailable(input.slug, categoryId);
    await this.ensureCategoryParentIntegrity(categoryId, input.parentId ?? null);

    const category = await this.prisma.category.update({
      where: {
        id: categoryId
      },
      data: {
        name: input.name,
        slug: input.slug,
        description: input.description,
        parentId: input.parentId ?? null,
        sortOrder: input.sortOrder,
        isActive: input.isActive
      },
      include: {
        parent: {
          select: {
            name: true
          }
        },
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      }
    });

    await this.auditService.record(viewer.id, "CATEGORY", categoryId, "CATEGORY_UPDATED", {
      previousSlug: existingCategory.slug,
      nextSlug: category.slug
    });

    const branchListingIds = await this.findListingIdsByCategoryBranch(categoryId);
    await this.syncListings(branchListingIds, viewer.id, "Category metadata refreshed.");

    return mapAdminCategorySummary(category);
  }

  async deleteCategory(viewer: AuthenticatedUser, categoryId: string) {
    const category = await this.prisma.category.findUnique({
      where: {
        id: categoryId
      },
      include: {
        _count: {
          select: {
            children: true,
            products: true
          }
        }
      }
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    if (category._count.children > 0 || category._count.products > 0) {
      throw new ConflictException(
        "Remove child categories and reassign products before deleting this category."
      );
    }

    await this.prisma.category.delete({
      where: {
        id: categoryId
      }
    });

    await this.auditService.record(viewer.id, "CATEGORY", categoryId, "CATEGORY_DELETED", {
      slug: category.slug
    });

    return {
      deletedCategoryId: categoryId
    };
  }

  async listProducts(rawQuery: Record<string, unknown>) {
    const query = productQuerySchema.parse(rawQuery);
    const products = await this.prisma.product.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                {
                  title: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  slug: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  listings: {
                    some: {
                      sellerSku: {
                        contains: query.q,
                        mode: "insensitive"
                      }
                    }
                  }
                }
              ]
            }
          : {})
      },
      include: adminProductInclude.include,
      orderBy: {
        updatedAt: "desc"
      },
      take: 24
    });

    return products.map((product) => mapAdminProductSummary(product));
  }

  async createProduct(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = upsertAdminProductRequestSchema.parse(rawInput);
    await this.ensureProductSlugAvailable(input.slug);
    await this.ensureSellerSkuAvailable(input.sellerSku);

    const product = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.resolveCategoryIdWithinTransaction(
        tx,
        input.categoryId ?? null
      );
      const brandId = await this.resolveBrandIdWithinTransaction(
        tx,
        input.brandName ?? null
      );
      const seller = await tx.seller.findUnique({
        where: {
          id: input.sellerId
        }
      });

      if (!seller) {
        throw new NotFoundException(`Seller ${input.sellerId} was not found.`);
      }

      const productRecord = await tx.product.create({
        data: {
          title: input.title,
          slug: input.slug,
          description: input.description,
          status: input.status,
          categoryId,
          brandId
        }
      });

      const variant = await tx.productVariant.create({
        data: {
          productId: productRecord.id,
          sku: `VEL-${productRecord.id.slice(-8).toUpperCase()}`,
          title: normalizeOptionalString(input.variantTitle) ?? "Default offer",
          isDefault: true
        }
      });

      const listing = await tx.sellerProductListing.create({
        data: {
          sellerId: seller.id,
          productId: productRecord.id,
          variantId: variant.id,
          sellerSku: input.sellerSku,
          status: input.status,
          isActive: input.status === "ACTIVE" && seller.status === "ACTIVE",
          leadTimeDays: input.leadTimeDays
        }
      });

      await tx.price.create({
        data: {
          listingId: listing.id,
          amount: input.priceAmount,
          compareAtAmount: input.compareAtAmount ?? null,
          currency: "RON"
        }
      });

      await tx.inventoryItem.create({
        data: {
          listingId: listing.id,
          onHand: input.onHand,
          safetyStock: input.safetyStock
        }
      });

      if (input.imageUrl) {
        await tx.productMedia.create({
          data: {
            productId: productRecord.id,
            storageKey: `media/products/${productRecord.id}/hero`,
            url: input.imageUrl,
            altText: normalizeOptionalString(input.imageAlt) ?? input.title,
            sortOrder: 0
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: productRecord.id,
          action: "PRODUCT_CREATED",
          details: {
            listingId: listing.id,
            sellerId: seller.id
          }
        }
      });

      return tx.product.findUniqueOrThrow({
        where: {
          id: productRecord.id
        },
        include: adminProductInclude.include
      });
    });

    const primaryListing = selectPrimaryListing(product);

    if (primaryListing && product.status === "ACTIVE") {
      await this.syncListings([primaryListing.id], viewer.id, "Product created.");
    }

    return mapAdminProductSummary(product);
  }

  async updateProduct(
    viewer: AuthenticatedUser,
    productId: string,
    rawInput: unknown
  ) {
    const input = upsertAdminProductRequestSchema.parse(rawInput);
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        id: productId
      },
      include: adminProductInclude.include
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    await this.ensureProductSlugAvailable(input.slug, productId);
    await this.ensureSellerSkuAvailable(input.sellerSku, input.listingId ?? undefined);

    const product = await this.prisma.$transaction(async (tx) => {
      const categoryId = await this.resolveCategoryIdWithinTransaction(
        tx,
        input.categoryId ?? null
      );
      const brandId = await this.resolveBrandIdWithinTransaction(
        tx,
        input.brandName ?? null
      );
      const seller = await tx.seller.findUnique({
        where: {
          id: input.sellerId
        }
      });

      if (!seller) {
        throw new NotFoundException(`Seller ${input.sellerId} was not found.`);
      }

      const selectedListing =
        (input.listingId
          ? existingProduct.listings.find((listing) => listing.id === input.listingId)
          : selectPrimaryListing(existingProduct)) ?? null;

      await tx.product.update({
        where: {
          id: productId
        },
        data: {
          title: input.title,
          slug: input.slug,
          description: input.description,
          status: input.status,
          categoryId,
          brandId
        }
      });

      let listingId = selectedListing?.id ?? null;

      if (selectedListing) {
        if (
          selectedListing.inventoryItem &&
          input.onHand < selectedListing.inventoryItem.reserved
        ) {
          throw new ConflictException(
            "On-hand stock cannot be set below the currently reserved quantity."
          );
        }

        let variantId = selectedListing.variantId;

        if (selectedListing.variantId && input.variantTitle) {
          await tx.productVariant.update({
            where: {
              id: selectedListing.variantId
            },
            data: {
              title: input.variantTitle
            }
          });
        } else if (!selectedListing.variantId && input.variantTitle) {
          const variant = await tx.productVariant.create({
            data: {
              productId,
              sku: `VEL-${productId.slice(-8).toUpperCase()}-${selectedListing.id.slice(-4).toUpperCase()}`,
              title: input.variantTitle,
              isDefault: existingProduct.listings.length === 0
            }
          });

          variantId = variant.id;
        }

        await tx.sellerProductListing.update({
          where: {
            id: selectedListing.id
          },
          data: {
            sellerId: seller.id,
            sellerSku: input.sellerSku,
            status: input.status,
            isActive: input.status === "ACTIVE" && seller.status === "ACTIVE",
            leadTimeDays: input.leadTimeDays,
            variantId: variantId ?? undefined
          }
        });

        const currentPrice =
          selectedListing.prices.find((price) => {
            const startsAtValid = price.startsAt ? price.startsAt <= new Date() : true;
            const endsAtValid = price.endsAt ? price.endsAt >= new Date() : true;
            return startsAtValid && endsAtValid;
          }) ?? null;

        if (
          !currentPrice ||
          currentPrice.amount !== input.priceAmount ||
          (currentPrice.compareAtAmount ?? null) !== (input.compareAtAmount ?? null)
        ) {
          await tx.price.create({
            data: {
              listingId: selectedListing.id,
              amount: input.priceAmount,
              compareAtAmount: input.compareAtAmount ?? null,
              currency: "RON"
            }
          });
        }

        if (selectedListing.inventoryItem) {
          await tx.inventoryItem.update({
            where: {
              id: selectedListing.inventoryItem.id
            },
            data: {
              onHand: input.onHand,
              safetyStock: input.safetyStock
            }
          });
        } else {
          await tx.inventoryItem.create({
            data: {
              listingId: selectedListing.id,
              onHand: input.onHand,
              safetyStock: input.safetyStock
            }
          });
        }

        listingId = selectedListing.id;
      } else {
        const variant = await tx.productVariant.create({
          data: {
            productId,
            sku: `VEL-${productId.slice(-8).toUpperCase()}-${slugify(input.sellerSku).slice(0, 6).toUpperCase()}`,
            title: normalizeOptionalString(input.variantTitle) ?? "Default offer",
            isDefault: true
          }
        });

        const listing = await tx.sellerProductListing.create({
          data: {
            sellerId: seller.id,
            productId,
            variantId: variant.id,
            sellerSku: input.sellerSku,
            status: input.status,
            isActive: input.status === "ACTIVE" && seller.status === "ACTIVE",
            leadTimeDays: input.leadTimeDays
          }
        });

        await tx.price.create({
          data: {
            listingId: listing.id,
            amount: input.priceAmount,
            compareAtAmount: input.compareAtAmount ?? null,
            currency: "RON"
          }
        });

        await tx.inventoryItem.create({
          data: {
            listingId: listing.id,
            onHand: input.onHand,
            safetyStock: input.safetyStock
          }
        });

        listingId = listing.id;
      }

      if (input.imageUrl) {
        const existingMedia = existingProduct.media[0] ?? null;

        if (existingMedia) {
          await tx.productMedia.update({
            where: {
              id: existingMedia.id
            },
            data: {
              url: input.imageUrl,
              altText: normalizeOptionalString(input.imageAlt) ?? input.title
            }
          });
        } else {
          await tx.productMedia.create({
            data: {
              productId,
              storageKey: `media/products/${productId}/hero`,
              url: input.imageUrl,
              altText: normalizeOptionalString(input.imageAlt) ?? input.title,
              sortOrder: 0
            }
          });
        }
      } else if (input.imageUrl === null) {
        await tx.productMedia.deleteMany({
          where: {
            productId
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: productId,
          action: "PRODUCT_UPDATED",
          details: {
            listingId
          }
        }
      });

      return tx.product.findUniqueOrThrow({
        where: {
          id: productId
        },
        include: adminProductInclude.include
      });
    });

    const listingIds = product.listings.map((listing) => listing.id);

    if (product.status === "ARCHIVED") {
      await this.removeListingsFromSearch(listingIds, viewer.id, "Product archived.");
    } else {
      await this.syncListings(listingIds, viewer.id, "Product updated.");
    }

    return mapAdminProductSummary(product);
  }

  async archiveProduct(viewer: AuthenticatedUser, productId: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        id: productId
      },
      include: adminProductInclude.include
    });

    if (!existingProduct) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    const listingIds = existingProduct.listings.map((listing) => listing.id);

    const product = await this.prisma.$transaction(async (tx) => {
      await tx.product.update({
        where: {
          id: productId
        },
        data: {
          status: "ARCHIVED"
        }
      });

      await tx.sellerProductListing.updateMany({
        where: {
          productId
        },
        data: {
          status: "ARCHIVED",
          isActive: false
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: productId,
          action: "PRODUCT_ARCHIVED"
        }
      });

      return tx.product.findUniqueOrThrow({
        where: {
          id: productId
        },
        include: adminProductInclude.include
      });
    });

    await this.removeListingsFromSearch(listingIds, viewer.id, "Product archived.");

    return mapAdminProductSummary(product);
  }

  async listInventory(rawQuery: Record<string, unknown>) {
    const query = inventoryQuerySchema.parse(rawQuery);
    const items = await this.prisma.inventoryItem.findMany({
      where: query.q
        ? {
            OR: [
              {
                listing: {
                  product: {
                    title: {
                      contains: query.q,
                      mode: "insensitive"
                    }
                  }
                }
              },
              {
                listing: {
                  product: {
                    slug: {
                      contains: query.q,
                      mode: "insensitive"
                    }
                  }
                }
              },
              {
                listing: {
                  sellerSku: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                }
              },
              {
                listing: {
                  seller: {
                    displayName: {
                      contains: query.q,
                      mode: "insensitive"
                    }
                  }
                }
              }
            ]
          }
        : undefined,
      include: adminInventoryInclude.include,
      orderBy: {
        updatedAt: "desc"
      },
      take: 80
    });

    const mapped = items.map((item) => mapAdminInventoryItem(item));

    return query.lowStock
      ? mapped.filter((item) => item.availableQuantity <= 5).slice(0, 24)
      : mapped.slice(0, 24);
  }

  async updateInventory(
    viewer: AuthenticatedUser,
    inventoryItemId: string,
    rawInput: unknown
  ) {
    const input = updateAdminInventoryRequestSchema.parse(rawInput);
    const inventoryItem = await this.prisma.inventoryItem.findUnique({
      where: {
        id: inventoryItemId
      },
      include: adminInventoryInclude.include
    });

    if (!inventoryItem) {
      throw new NotFoundException(`Inventory item ${inventoryItemId} was not found.`);
    }

    if (input.onHand < inventoryItem.reserved) {
      throw new ConflictException(
        "On-hand stock cannot be reduced below the currently reserved quantity."
      );
    }

    const updatedInventoryItem = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventoryItem.update({
        where: {
          id: inventoryItemId
        },
        data: {
          onHand: input.onHand,
          safetyStock: input.safetyStock
        },
        include: adminInventoryInclude.include
      });

      await tx.sellerProductListing.update({
        where: {
          id: updated.listingId
        },
        data: {
          leadTimeDays: input.leadTimeDays
        }
      });

      const delta = input.onHand - inventoryItem.onHand;

      if (delta !== 0 || input.safetyStock !== inventoryItem.safetyStock) {
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId,
            delta,
            type: "ADJUSTMENT",
            note:
              normalizeOptionalString(input.note) ??
              `Admin adjustment by ${viewer.email}.`
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "INVENTORY_ITEM",
          entityId: inventoryItemId,
          action: "INVENTORY_UPDATED",
          details: {
            onHand: input.onHand,
            safetyStock: input.safetyStock,
            leadTimeDays: input.leadTimeDays
          }
        }
      });

      return updated;
    });

    await this.syncListings([updatedInventoryItem.listingId], viewer.id, "Inventory updated.");

    return mapAdminInventoryItem({
      ...updatedInventoryItem,
      listing: {
        ...updatedInventoryItem.listing,
        leadTimeDays: input.leadTimeDays
      }
    });
  }

  async listOrders(rawQuery: Record<string, unknown>) {
    const query = ordersQuerySchema.parse(rawQuery);
    const orders = await this.prisma.order.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                {
                  number: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  user: {
                    is: {
                      email: {
                        contains: query.q,
                        mode: "insensitive"
                      }
                    }
                  }
                },
                {
                  user: {
                    is: {
                      firstName: {
                        contains: query.q,
                        mode: "insensitive"
                      }
                    }
                  }
                },
                {
                  user: {
                    is: {
                      lastName: {
                        contains: query.q,
                        mode: "insensitive"
                      }
                    }
                  }
                }
              ]
            }
          : {})
      },
      include: adminOrderInclude.include,
      orderBy: {
        updatedAt: "desc"
      },
      take: 20
    });

    return orders.map((order) => mapAdminOrderSummary(order));
  }

  async getOrderDetail(number: string) {
    const order = await this.prisma.order.findUnique({
      where: {
        number
      },
      include: adminOrderInclude.include
    });

    if (!order) {
      throw new NotFoundException(`Order ${number} was not found.`);
    }

    return mapAdminOrderDetail(order);
  }

  async updateOrderStatus(
    viewer: AuthenticatedUser,
    number: string,
    rawInput: unknown
  ) {
    const input = updateAdminOrderStatusRequestSchema.parse(rawInput);
    const order = await this.prisma.order.findUnique({
      where: {
        number
      },
      include: adminOrderInclude.include
    });

    if (!order) {
      throw new NotFoundException(`Order ${number} was not found.`);
    }

    if (input.status === "REFUNDED" && order.paymentStatus !== "REFUNDED") {
      throw new BadRequestException(
        "Use the refund action before moving an order into the REFUNDED state."
      );
    }

    if (!canTransitionOrderStatus(order.status, input.status)) {
      throw new BadRequestException(
        `Order ${number} cannot transition from ${order.status} to ${input.status}.`
      );
    }

    const nextPaymentStatus =
      input.status === "PAID" ||
      input.status === "PROCESSING" ||
      input.status === "SHIPPED" ||
      input.status === "COMPLETED"
        ? order.paymentStatus === "REFUNDED" || order.paymentStatus === "PARTIALLY_REFUNDED"
          ? order.paymentStatus
          : "SUCCEEDED"
        : input.status === "PAYMENT_PENDING"
          ? "PENDING"
          : input.status === "CANCELED" && order.paymentStatus === "PENDING"
            ? "FAILED"
            : order.paymentStatus;

    const updatedOrder = await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: {
          id: order.id
        },
        data: {
          status: input.status,
          paymentStatus: nextPaymentStatus,
          placedAt:
            input.status === "PAID" ||
            input.status === "PROCESSING" ||
            input.status === "SHIPPED" ||
            input.status === "COMPLETED"
              ? (order.placedAt ?? new Date())
              : order.placedAt
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          actorUserId: viewer.id,
          status: input.status,
          note:
            normalizeOptionalString(input.note) ??
            `Admin status update to ${input.status}.`
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "ORDER",
          entityId: order.id,
          action: "ORDER_STATUS_UPDATED",
          details: {
            from: order.status,
            to: input.status
          }
        }
      });

      return tx.order.findUniqueOrThrow({
        where: {
          id: order.id
        },
        include: adminOrderInclude.include
      });
    });

    return mapAdminOrderDetail(updatedOrder);
  }

  async listCustomers(rawQuery: Record<string, unknown>) {
    const query = customersQuerySchema.parse(rawQuery);
    const customers = await this.prisma.user.findMany({
      where: {
        roleAssignments: {
          some: {
            role: {
              code: "CUSTOMER"
            }
          }
        },
        ...(query.q
          ? {
              OR: [
                {
                  email: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  firstName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  lastName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                }
              ]
            }
          : {})
      },
      include: adminCustomerInclude.include,
      orderBy: {
        createdAt: "desc"
      },
      take: 24
    });

    return customers.map((customer) => mapAdminCustomerSummary(customer));
  }

  async listSellers(rawQuery: Record<string, unknown>) {
    const query = sellersQuerySchema.parse(rawQuery);
    const sellers = await this.prisma.seller.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                {
                  displayName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  legalName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  contactEmail: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                }
              ]
            }
          : {})
      },
      include: adminSellerInclude.include,
      orderBy: {
        updatedAt: "desc"
      },
      take: 24
    });

    return sellers.map((seller) => mapAdminSellerSummary(seller));
  }

  async updateSeller(
    viewer: AuthenticatedUser,
    sellerId: string,
    rawInput: unknown
  ) {
    const input = updateAdminSellerRequestSchema.parse(rawInput);
    const seller = await this.prisma.seller.findUnique({
      where: {
        id: sellerId
      },
      include: adminSellerInclude.include
    });

    if (!seller) {
      throw new NotFoundException(`Seller ${sellerId} was not found.`);
    }

    await this.ensureSellerEmailAvailable(input.contactEmail, sellerId);
    const listingIds = seller.listings.map((listing) => listing.id);

    const updatedSeller = await this.prisma.$transaction(async (tx) => {
      const nextSeller = await tx.seller.update({
        where: {
          id: sellerId
        },
        data: {
          displayName: input.displayName,
          legalName: input.legalName,
          contactEmail: input.contactEmail,
          status: input.status
        },
        include: adminSellerInclude.include
      });

      if (input.status === "ACTIVE") {
        await tx.sellerProductListing.updateMany({
          where: {
            sellerId,
            status: "ACTIVE"
          },
          data: {
            isActive: true
          }
        });
      } else {
        await tx.sellerProductListing.updateMany({
          where: {
            sellerId
          },
          data: {
            isActive: false
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER",
          entityId: sellerId,
          action: "SELLER_UPDATED",
          details: {
            status: input.status
          }
        }
      });

      return nextSeller;
    });

    if (input.status === "ACTIVE") {
      await this.syncListings(listingIds, viewer.id, "Seller reactivated.");
    } else {
      await this.removeListingsFromSearch(
        listingIds,
        viewer.id,
        `Seller moved to ${input.status}.`
      );
    }

    return mapAdminSellerSummary({
      ...updatedSeller,
      listings: updatedSeller.listings.map((listing) => ({
        ...listing,
        isActive: input.status === "ACTIVE" ? listing.status === "ACTIVE" : false
      }))
    });
  }

  async getOperationsOverview() {
    const [
      searchDocuments,
      reindexJobs,
      pendingSyncLogs,
      failedSyncLogs,
      auditLogs,
      webhookDeliveries,
      activeReservations,
      recentReindexJobs,
      recentSyncLogs,
      recentAuditLogs,
      recentWebhookDeliveries
    ] = await Promise.all([
      this.prisma.searchDocument.count(),
      this.prisma.reindexJob.count(),
      this.prisma.searchSyncLog.count({
        where: {
          status: "PENDING"
        }
      }),
      this.prisma.searchSyncLog.count({
        where: {
          status: "FAILED"
        }
      }),
      this.prisma.auditLog.count(),
      this.prisma.webhookDeliveryRecord.count(),
      this.prisma.stockReservation.count({
        where: {
          status: "ACTIVE"
        }
      }),
      this.prisma.reindexJob.findMany({
        include: {
          requestedByUser: {
            select: {
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 6
      }),
      this.prisma.searchSyncLog.findMany({
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      this.prisma.auditLog.findMany({
        include: {
          actorUser: {
            select: {
              email: true
            }
          }
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 8
      }),
      this.prisma.webhookDeliveryRecord.findMany({
        orderBy: {
          receivedAt: "desc"
        },
        take: 8
      })
    ]);

    return adminOperationsOverviewSchema.parse({
      metrics: {
        searchDocuments,
        reindexJobs,
        pendingSyncLogs,
        failedSyncLogs,
        auditLogs,
        webhookDeliveries,
        activeReservations
      },
      recentReindexJobs: recentReindexJobs.map((job) => mapAdminReindexJobSummary(job)),
      recentSyncLogs: recentSyncLogs.map((log) => mapAdminSearchSyncLog(log)),
      recentAuditLogs: recentAuditLogs.map((auditLog) =>
        mapAdminAuditLogSummary(auditLog)
      ),
      recentWebhookDeliveries: recentWebhookDeliveries.map((delivery) =>
        mapAdminWebhookDeliverySummary(delivery)
      )
    });
  }

  async triggerReindex(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = triggerReindexRequestSchema.parse(rawInput);
    const startedAt = new Date();
    const reindexJob = await this.prisma.reindexJob.create({
      data: {
        requestedByUserId: viewer.id,
        scope: input.scope,
        status: "RUNNING",
        startedAt
      }
    });
    const jobRun = await this.prisma.jobRun.create({
      data: {
        jobType: "SEARCH_REINDEX",
        status: "RUNNING",
        payload: {
          scope: input.scope,
          requestedByUserId: viewer.id
        } as Prisma.InputJsonValue
      }
    });

    try {
      const documents = await this.projectionService.collectDocuments();
      await this.projectionService.syncProjectionRecords(documents);
      await this.openSearchService.replaceDocuments(documents);

      if (documents.length > 0) {
        await this.prisma.searchSyncLog.createMany({
          data: documents.map((document) => ({
            listingId: document.listingId,
            documentId: `listing-${document.listingId}`,
            status: "INDEXED",
            message: `Reindexed via ${input.scope}.`
          }))
        });
      }

      const finishedAt = new Date();

      await Promise.all([
        this.prisma.reindexJob.update({
          where: {
            id: reindexJob.id
          },
          data: {
            status: "SUCCEEDED",
            finishedAt
          }
        }),
        this.prisma.jobRun.update({
          where: {
            id: jobRun.id
          },
          data: {
            status: "SUCCEEDED",
            finishedAt
          }
        }),
        this.auditService.record(viewer.id, "REINDEX_JOB", reindexJob.id, "REINDEX_TRIGGERED", {
          scope: input.scope,
          documents: documents.length
        })
      ]);

      return triggerReindexResponseSchema.parse({
        jobId: reindexJob.id,
        scope: input.scope,
        processedDocuments: documents.length,
        indexedDocuments: documents.length,
        status: "SUCCEEDED",
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        errorMessage: null
      });
    } catch (error) {
      const finishedAt = new Date();
      const errorMessage =
        error instanceof Error ? error.message : "Unknown reindex failure.";

      await Promise.all([
        this.prisma.reindexJob.update({
          where: {
            id: reindexJob.id
          },
          data: {
            status: "FAILED",
            finishedAt,
            errorMessage
          }
        }),
        this.prisma.jobRun.update({
          where: {
            id: jobRun.id
          },
          data: {
            status: "FAILED",
            finishedAt,
            errorMessage
          }
        }),
        this.prisma.searchSyncLog.create({
          data: {
            status: "FAILED",
            message: `${input.scope}: ${errorMessage}`
          }
        })
      ]);

      return triggerReindexResponseSchema.parse({
        jobId: reindexJob.id,
        scope: input.scope,
        processedDocuments: 0,
        indexedDocuments: 0,
        status: "FAILED",
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        errorMessage
      });
    }
  }

  async releaseExpiredReservations(viewer: AuthenticatedUser) {
    return this.inventoryService.releaseExpiredReservations(viewer.id);
  }

  private async resolveCategoryIdWithinTransaction(
    tx: PrismaTransactionClient,
    categoryId: string | null
  ) {
    if (!categoryId) {
      return null;
    }

    const category = await tx.category.findUnique({
      where: {
        id: categoryId
      }
    });

    if (!category) {
      throw new NotFoundException(`Category ${categoryId} was not found.`);
    }

    return category.id;
  }

  private async resolveBrandIdWithinTransaction(
    tx: PrismaTransactionClient,
    brandName: string | null
  ) {
    const normalizedName = normalizeOptionalString(brandName);

    if (!normalizedName) {
      return null;
    }

    const slug = slugify(normalizedName);
    const existingBrand = await tx.brand.findUnique({
      where: {
        slug
      }
    });

    if (existingBrand) {
      return existingBrand.id;
    }

    const brand = await tx.brand.create({
      data: {
        name: normalizedName,
        slug
      }
    });

    return brand.id;
  }

  private async ensureCategorySlugAvailable(slug: string, excludeCategoryId?: string) {
    const existingCategory = await this.prisma.category.findUnique({
      where: {
        slug
      }
    });

    if (existingCategory && existingCategory.id !== excludeCategoryId) {
      throw new ConflictException(`Category slug ${slug} is already in use.`);
    }
  }

  private async ensureCategoryParentAvailable(parentId: string) {
    const parentCategory = await this.prisma.category.findUnique({
      where: {
        id: parentId
      }
    });

    if (!parentCategory) {
      throw new NotFoundException(`Category ${parentId} was not found.`);
    }
  }

  private async ensureCategoryParentIntegrity(
    categoryId: string,
    parentId: string | null
  ) {
    if (!parentId) {
      return;
    }

    if (parentId === categoryId) {
      throw new BadRequestException("A category cannot be its own parent.");
    }

    await this.ensureCategoryParentAvailable(parentId);

    let currentParentId: string | null = parentId;

    while (currentParentId) {
      if (currentParentId === categoryId) {
        throw new BadRequestException(
          "A category cannot be moved under one of its descendants."
        );
      }

      const nextCategory: { parentId: string | null } | null =
        await this.prisma.category.findUnique({
        where: {
          id: currentParentId
        },
        select: {
          parentId: true
        }
      });

      currentParentId = nextCategory?.parentId ?? null;
    }
  }

  private async ensureProductSlugAvailable(slug: string, excludeProductId?: string) {
    const existingProduct = await this.prisma.product.findUnique({
      where: {
        slug
      }
    });

    if (existingProduct && existingProduct.id !== excludeProductId) {
      throw new ConflictException(`Product slug ${slug} is already in use.`);
    }
  }

  private async ensureSellerSkuAvailable(
    sellerSku: string,
    excludeListingId?: string
  ) {
    const existingListing = await this.prisma.sellerProductListing.findUnique({
      where: {
        sellerSku
      }
    });

    if (existingListing && existingListing.id !== excludeListingId) {
      throw new ConflictException(`Seller SKU ${sellerSku} is already in use.`);
    }
  }

  private async ensureSellerEmailAvailable(contactEmail: string, excludeSellerId?: string) {
    const existingSeller = await this.prisma.seller.findUnique({
      where: {
        contactEmail
      }
    });

    if (existingSeller && existingSeller.id !== excludeSellerId) {
      throw new ConflictException(`Seller email ${contactEmail} is already in use.`);
    }
  }

  private async findListingIdsByCategoryBranch(categoryId: string) {
    const categories = await this.prisma.category.findMany({
      select: {
        id: true,
        parentId: true
      }
    });
    const childrenByParentId = new Map<string | null, string[]>();

    for (const category of categories) {
      const bucket = childrenByParentId.get(category.parentId) ?? [];
      bucket.push(category.id);
      childrenByParentId.set(category.parentId, bucket);
    }

    const branchIds = [categoryId];
    const queue = [...(childrenByParentId.get(categoryId) ?? [])];

    while (queue.length > 0) {
      const nextCategoryId = queue.shift();

      if (!nextCategoryId) {
        continue;
      }

      branchIds.push(nextCategoryId);
      queue.push(...(childrenByParentId.get(nextCategoryId) ?? []));
    }

    const listings = await this.prisma.sellerProductListing.findMany({
      where: {
        product: {
          categoryId: {
            in: branchIds
          }
        }
      },
      select: {
        id: true
      }
    });

    return listings.map((listing) => listing.id);
  }

  private async syncListings(
    listingIds: string[],
    actorUserId: string,
    message: string
  ) {
    if (listingIds.length === 0) {
      return;
    }

    const documents = await this.projectionService.collectDocumentsByListingIds(listingIds);

    if (documents.length > 0) {
      await this.projectionService.syncProjectionRecords(documents);
      const openSearchSynced = await this.openSearchService.syncDocuments(documents, {
        force: true
      });

      await this.prisma.searchSyncLog.createMany({
        data: documents.map((document) => ({
          listingId: document.listingId,
          documentId: `listing-${document.listingId}`,
          status: "INDEXED",
          message: openSearchSynced ? message : `${message} OpenSearch unavailable.`
        }))
      });
    }

    const activeListingIds = new Set(documents.map((document) => document.listingId));
    const removedListingIds = listingIds.filter((listingId) => !activeListingIds.has(listingId));

    if (removedListingIds.length > 0) {
      await this.removeListingsFromSearch(removedListingIds, actorUserId, message);
    }
  }

  private async removeListingsFromSearch(
    listingIds: string[],
    actorUserId: string,
    message: string
  ) {
    if (listingIds.length === 0) {
      return;
    }

    const [firstListingId] = listingIds;

    if (!firstListingId) {
      return;
    }

    await this.projectionService.removeProjectionRecords(listingIds);
    await this.openSearchService.removeDocuments(listingIds);
    await this.prisma.searchSyncLog.createMany({
      data: listingIds.map((listingId) => ({
        listingId,
        documentId: `listing-${listingId}`,
        status: "INDEXED",
        message
      }))
    });
    await this.auditService.record(
      actorUserId,
      "SEARCH_DOCUMENT",
      firstListingId,
      "SEARCH_SYNC_UPDATED",
      {
        listings: listingIds,
        message
      }
    );
  }
}
