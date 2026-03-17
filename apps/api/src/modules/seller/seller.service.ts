import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "@velora/contracts";
import {
  createSellerCatalogProductRequestSchema,
  createSellerListingRequestSchema,
  sellerDashboardSchema,
  sellerProductCreationOptionsSchema,
  updateSellerCatalogProductRequestSchema,
  updateSellerInventoryRequestSchema,
  updateSellerListingCommercialRequestSchema
} from "@velora/contracts";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { PlatformCacheService } from "../platform-cache/platform-cache.service";
import { calculateAvailableQuantity } from "../search/search.helpers";
import { OpenSearchService } from "../search/opensearch.service";
import { SearchProjectionService } from "../search/search.service";
import {
  mapSellerListingCatalogOption,
  mapSellerListingSummary,
  mapSellerOrderDetail,
  mapSellerOrderSummary,
  resolveActivePrice,
  slugify,
  sellerCatalogOptionInclude,
  sellerListingInclude,
  sellerOrderInclude
} from "./seller.helpers";

type PrismaTransactionClient = Prisma.TransactionClient;

@Injectable()
export class SellerService {
  private readonly adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectionService: SearchProjectionService,
    private readonly openSearchService: OpenSearchService,
    private readonly cacheService: PlatformCacheService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getDashboard(viewer: AuthenticatedUser) {
    const seller = await this.getSellerScope(viewer.id);
    const [activeListings, inventoryItems, activeReservations, openOrders, totalOrders] =
      await Promise.all([
        this.prisma.sellerProductListing.count({
          where: {
            sellerId: seller.id,
            status: "ACTIVE",
            isActive: true,
            product: {
              status: "ACTIVE"
            }
          }
        }),
        this.prisma.inventoryItem.findMany({
          where: {
            listing: {
              sellerId: seller.id
            }
          },
          select: {
            onHand: true,
            reserved: true,
            safetyStock: true
          }
        }),
        this.prisma.stockReservation.aggregate({
          where: {
            status: "ACTIVE",
            inventoryItem: {
              listing: {
                sellerId: seller.id
              }
            }
          },
          _sum: {
            quantity: true
          }
        }),
        this.prisma.order.count({
          where: {
            status: {
              in: ["CREATED", "PAYMENT_PENDING", "PAID", "PROCESSING", "SHIPPED"]
            },
            items: {
              some: {
                listing: {
                  sellerId: seller.id
                }
              }
            }
          }
        }),
        this.prisma.order.count({
          where: {
            items: {
              some: {
                listing: {
                  sellerId: seller.id
                }
              }
            }
          }
        })
      ]);

    const lowStockListings = inventoryItems.filter(
      (item) => calculateAvailableQuantity(item) <= 5
    ).length;
    const availableUnits = inventoryItems.reduce(
      (sum, item) => sum + calculateAvailableQuantity(item),
      0
    );
    const reservedUnits = inventoryItems.reduce(
      (sum, item) => sum + item.reserved,
      0
    );

    return sellerDashboardSchema.parse({
      generatedAt: new Date().toISOString(),
      seller: {
        sellerId: seller.id,
        slug: seller.slug,
        displayName: seller.displayName,
        status: seller.status
      },
      metrics: {
        activeListings,
        lowStockListings,
        availableUnits,
        reservedUnits: activeReservations._sum.quantity ?? reservedUnits,
        openOrders,
        totalOrders
      },
      notes: [
        "Seller metrics are scoped to listings owned by the active merchant account.",
        "Inventory updates refresh transactional stock and search availability in the same flow."
      ]
    });
  }

  async listListings(viewer: AuthenticatedUser) {
    const seller = await this.getSellerScope(viewer.id);
    const listings = await this.prisma.sellerProductListing.findMany({
      where: {
        sellerId: seller.id
      },
      include: sellerListingInclude.include,
      orderBy: {
        updatedAt: "desc"
      }
    });

    return listings.map((listing) => mapSellerListingSummary(listing));
  }

  async listCatalogOptions(viewer: AuthenticatedUser) {
    const seller = await this.getSellerScope(viewer.id);
    const products = await this.prisma.product.findMany({
      where: {
        status: "ACTIVE",
        OR: [
          {
            ownerSellerId: null
          },
          {
            ownerSellerId: seller.id
          }
        ]
      },
      include: sellerCatalogOptionInclude.include,
      orderBy: {
        updatedAt: "desc"
      }
    });

    return products.map((product) =>
      mapSellerListingCatalogOption(product, seller.id)
    );
  }

  async getProductCreationOptions(viewer: AuthenticatedUser) {
    await this.getSellerScope(viewer.id);

    const categories = await this.prisma.category.findMany({
      where: {
        isActive: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        parentId: true
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }]
    });

    const categoryMap = new Map(categories.map((category) => [category.id, category]));

    return sellerProductCreationOptionsSchema.parse({
      categories: categories.map((category) => ({
        categoryId: category.id,
        name: category.name,
        slug: category.slug,
        label: this.buildCategoryLabel(category.id, categoryMap)
      }))
    });
  }

  async createCatalogProduct(viewer: AuthenticatedUser, rawInput: unknown) {
    const seller = await this.getSellerScope(viewer.id);
    const input = createSellerCatalogProductRequestSchema.parse(rawInput);
    await this.ensureSellerSkuAvailable(input.sellerSku);

    const createdListing = await this.prisma.$transaction(async (tx) => {
      const category = await this.resolveActiveCategoryWithinTransaction(
        tx,
        input.categoryId
      );
      const brandId = await this.resolveBrandIdWithinTransaction(
        tx,
        input.brandName ?? null
      );
      const productSlug = await this.generateUniqueProductSlug(
        tx,
        input.title,
        seller.slug
      );
      const productStatus = seller.status === "ACTIVE" ? "ACTIVE" : "DRAFT";
      const product = await tx.product.create({
        data: {
          title: input.title,
          slug: productSlug,
          description: input.description,
          status: productStatus,
          categoryId: category.id,
          brandId,
          ownerSellerId: seller.id
        }
      });
      const variantTitle = input.variantTitle?.trim();
      const variant = variantTitle
        ? await tx.productVariant.create({
            data: {
              productId: product.id,
              sku: `SELL-${product.id.slice(-8).toUpperCase()}`,
              title: variantTitle,
              isDefault: true
            }
          })
        : null;
      const listing = await tx.sellerProductListing.create({
        data: {
          sellerId: seller.id,
          productId: product.id,
          variantId: variant?.id ?? null,
          sellerSku: input.sellerSku.trim(),
          status: productStatus,
          isActive: productStatus === "ACTIVE" && input.isActive,
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
            productId: product.id,
            storageKey: `seller-products/${seller.slug}/${product.id}/hero`,
            url: input.imageUrl,
            altText: input.imageAlt?.trim() || input.title,
            sortOrder: 0
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: product.id,
          action: "SELLER_PRODUCT_CREATED",
          details: {
            categoryId: category.id,
            listingId: listing.id,
            sellerId: seller.id,
            sellerSku: input.sellerSku.trim(),
            note:
              input.note?.trim() ||
              `Seller product created by ${viewer.email}.`
          }
        }
      });

      return listing;
    });

    if (createdListing.isActive) {
      await this.syncListings(
        [createdListing.id],
        viewer.id,
        "Seller-created catalog product published."
      );
    }

    await this.invalidateStorefrontReadCaches();
    await this.notificationsService.notifyAdmins({
      kind: "OPERATIONS",
      level: "INFO",
      title: "Seller catalog product created",
      message: `${seller.displayName} created a new catalog product: ${input.title}.`,
      linkUrl: `${this.adminUrl}#products`,
      actorUserId: viewer.id
    });

    const listing = await this.prisma.sellerProductListing.findUniqueOrThrow({
      where: {
        id: createdListing.id
      },
      include: sellerListingInclude.include
    });

    return mapSellerListingSummary(listing);
  }

  async createListing(viewer: AuthenticatedUser, rawInput: unknown) {
    const seller = await this.getSellerScope(viewer.id);
    const input = createSellerListingRequestSchema.parse(rawInput);
    await this.ensureSellerSkuAvailable(input.sellerSku);

    const product = await this.prisma.product.findUnique({
      where: {
        id: input.productId
      },
      include: sellerCatalogOptionInclude.include
    });

    if (!product || product.status !== "ACTIVE") {
      throw new NotFoundException(
        `Product ${input.productId} is not available for seller offers.`
      );
    }

    if (product.ownerSellerId && product.ownerSellerId !== seller.id) {
      throw new ConflictException(
        "Seller-owned catalog products can only be listed by the merchant that owns them."
      );
    }

    const selectedVariant =
      (input.variantId
        ? product.variants.find((variant) => variant.id === input.variantId)
        : product.variants.find((variant) => variant.isDefault) ?? product.variants[0]) ??
      null;

    if (input.variantId && !selectedVariant) {
      throw new NotFoundException(
        `Variant ${input.variantId} was not found on product ${product.title}.`
      );
    }

    const existingListing = await this.prisma.sellerProductListing.findFirst({
      where: {
        sellerId: seller.id,
        productId: product.id,
        variantId: selectedVariant?.id ?? null,
        status: {
          not: "ARCHIVED"
        }
      }
    });

    if (existingListing) {
      throw new ConflictException(
        "An active seller offer already exists for this product variant."
      );
    }

    const createdListing = await this.prisma.$transaction(async (tx) => {
      const listing = await tx.sellerProductListing.create({
        data: {
          sellerId: seller.id,
          productId: product.id,
          variantId: selectedVariant?.id ?? null,
          sellerSku: input.sellerSku.trim(),
          status: "ACTIVE",
          isActive: input.isActive && seller.status === "ACTIVE",
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

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER_PRODUCT_LISTING",
          entityId: listing.id,
          action: "SELLER_LISTING_CREATED",
          details: {
            productId: product.id,
            variantId: selectedVariant?.id ?? null,
            sellerSku: input.sellerSku.trim(),
            note:
              input.note?.trim() ||
              `Seller offer created by ${viewer.email}.`
          }
        }
      });

      return listing;
    });

    if (createdListing.isActive) {
      await this.syncListings(
        [createdListing.id],
        viewer.id,
        "Seller offer created."
      );
    }

    await this.invalidateStorefrontReadCaches();

    const listing = await this.prisma.sellerProductListing.findUniqueOrThrow({
      where: {
        id: createdListing.id
      },
      include: sellerListingInclude.include
    });

    return mapSellerListingSummary(listing);
  }

  async updateCatalogProduct(
    viewer: AuthenticatedUser,
    productId: string,
    rawInput: unknown
  ) {
    const seller = await this.getSellerScope(viewer.id);
    const input = updateSellerCatalogProductRequestSchema.parse(rawInput);
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        media: {
          orderBy: {
            sortOrder: "asc"
          }
        },
        listings: {
          select: {
            id: true,
            status: true,
            isActive: true
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    if (product.ownerSellerId !== seller.id) {
      throw new ConflictException(
        "Only seller-owned catalog products can be edited from the seller workspace."
      );
    }

    const category = await this.prisma.$transaction(async (tx) => {
      const resolvedCategory = await this.resolveActiveCategoryWithinTransaction(
        tx,
        input.categoryId
      );
      const brandId = await this.resolveBrandIdWithinTransaction(
        tx,
        input.brandName ?? null
      );

      await tx.product.update({
        where: {
          id: productId
        },
        data: {
          title: input.title,
          description: input.description,
          categoryId: resolvedCategory.id,
          brandId
        }
      });

      const heroMedia = product.media[0] ?? null;
      const imageUrl = input.imageUrl?.trim() ?? "";

      if (imageUrl.length > 0) {
        if (heroMedia) {
          await tx.productMedia.update({
            where: {
              id: heroMedia.id
            },
            data: {
              url: imageUrl,
              altText: input.imageAlt?.trim() || input.title
            }
          });
        } else {
          await tx.productMedia.create({
            data: {
              productId,
              storageKey: `seller-products/${seller.slug}/${productId}/hero`,
              url: imageUrl,
              altText: input.imageAlt?.trim() || input.title,
              sortOrder: 0
            }
          });
        }
      } else if (heroMedia) {
        await tx.productMedia.delete({
          where: {
            id: heroMedia.id
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: productId,
          action: "SELLER_PRODUCT_UPDATED",
          details: {
            sellerId: seller.id,
            categoryId: resolvedCategory.id,
            note:
              input.note?.trim() ||
              `Seller catalog product updated by ${viewer.email}.`
          }
        }
      });

      return resolvedCategory;
    });

    const listingIds = product.listings.map((listing) => listing.id);
    const hasSearchEligibleListings = product.listings.some(
      (listing) => listing.status === "ACTIVE" && listing.isActive
    );

    if (hasSearchEligibleListings) {
      await this.syncListings(
        listingIds,
        viewer.id,
        "Seller-owned catalog product updated."
      );
    }

    await this.invalidateStorefrontReadCaches();
    await this.notificationsService.notifyAdmins({
      kind: "OPERATIONS",
      level: "INFO",
      title: "Seller catalog product updated",
      message: `${seller.displayName} updated a seller-owned catalog product in ${category.name}.`,
      linkUrl: `${this.adminUrl}#products`,
      actorUserId: viewer.id
    });

    const listing = await this.prisma.sellerProductListing.findFirstOrThrow({
      where: {
        sellerId: seller.id,
        productId
      },
      include: sellerListingInclude.include,
      orderBy: {
        updatedAt: "desc"
      }
    });

    return mapSellerListingSummary(listing);
  }

  async updateInventory(
    viewer: AuthenticatedUser,
    inventoryItemId: string,
    rawInput: unknown
  ) {
    const seller = await this.getSellerScope(viewer.id);
    const input = updateSellerInventoryRequestSchema.parse(rawInput);
    const inventoryItem = await this.prisma.inventoryItem.findFirst({
      where: {
        id: inventoryItemId,
        listing: {
          sellerId: seller.id
        }
      },
      select: {
        id: true,
        listingId: true,
        onHand: true,
        reserved: true,
        safetyStock: true
      }
    });

    if (!inventoryItem) {
      throw new NotFoundException(
        `Inventory item ${inventoryItemId} was not found for seller ${seller.displayName}.`
      );
    }

    if (input.onHand < inventoryItem.reserved) {
      throw new ConflictException(
        "On-hand stock cannot be reduced below the currently reserved quantity."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.inventoryItem.update({
        where: {
          id: inventoryItemId
        },
        data: {
          onHand: input.onHand,
          safetyStock: input.safetyStock
        }
      });

      await tx.sellerProductListing.update({
        where: {
          id: inventoryItem.listingId
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
              input.note?.trim() ||
              `Seller stock adjustment by ${viewer.email}.`
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "INVENTORY_ITEM",
          entityId: inventoryItemId,
          action: "SELLER_INVENTORY_UPDATED",
          details: {
            onHand: input.onHand,
            safetyStock: input.safetyStock,
            leadTimeDays: input.leadTimeDays
          }
        }
      });
    });

    await this.syncListings([inventoryItem.listingId], viewer.id, "Seller inventory updated.");
    await this.invalidateStorefrontReadCaches();

    const listing = await this.prisma.sellerProductListing.findUniqueOrThrow({
      where: {
        id: inventoryItem.listingId
      },
      include: sellerListingInclude.include
    });

    return mapSellerListingSummary(listing);
  }

  async updateListing(
    viewer: AuthenticatedUser,
    listingId: string,
    rawInput: unknown
  ) {
    const seller = await this.getSellerScope(viewer.id);
    const input = updateSellerListingCommercialRequestSchema.parse(rawInput);
    const listing = await this.prisma.sellerProductListing.findFirst({
      where: {
        id: listingId,
        sellerId: seller.id
      },
      include: sellerListingInclude.include
    });

    if (!listing) {
      throw new NotFoundException(
        `Listing ${listingId} was not found for seller ${seller.displayName}.`
      );
    }

    if (
      input.isActive &&
      (listing.status !== "ACTIVE" || listing.product.status !== "ACTIVE")
    ) {
      throw new ConflictException(
        "Only active listings attached to active products can be exposed to customers."
      );
    }

    const currentPrice = resolveActivePrice(listing.prices);

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProductListing.update({
        where: {
          id: listingId
        },
        data: {
          isActive: input.isActive
        }
      });

      if (
        !currentPrice ||
        currentPrice.amount !== input.priceAmount ||
        (currentPrice.compareAtAmount ?? null) !==
          (input.compareAtAmount ?? null)
      ) {
        await tx.price.create({
          data: {
            listingId,
            amount: input.priceAmount,
            compareAtAmount: input.compareAtAmount ?? null,
            currency: currentPrice?.currency ?? "RON"
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER_PRODUCT_LISTING",
          entityId: listingId,
          action: "SELLER_LISTING_UPDATED",
          details: {
            priceAmount: input.priceAmount,
            compareAtAmount: input.compareAtAmount ?? null,
            isActive: input.isActive,
            note:
              input.note?.trim() ||
              `Seller commercial update by ${viewer.email}.`
          }
        }
      });
    });

    if (input.isActive) {
      await this.syncListings(
        [listingId],
        viewer.id,
        "Seller commercial terms updated."
      );
    } else {
      await this.removeListingsFromSearch(
        [listingId],
        viewer.id,
        "Seller offer hidden from storefront."
      );
    }
    await this.invalidateStorefrontReadCaches();

    const updatedListing = await this.prisma.sellerProductListing.findUniqueOrThrow(
      {
        where: {
          id: listingId
        },
        include: sellerListingInclude.include
      }
    );

    return mapSellerListingSummary(updatedListing);
  }

  async reactivateListing(viewer: AuthenticatedUser, listingId: string) {
    const seller = await this.getSellerScope(viewer.id);
    const listing = await this.prisma.sellerProductListing.findFirst({
      where: {
        id: listingId,
        sellerId: seller.id
      },
      include: sellerListingInclude.include
    });

    if (!listing) {
      throw new NotFoundException(
        `Listing ${listingId} was not found for seller ${seller.displayName}.`
      );
    }

    if (listing.status !== "ARCHIVED") {
      return mapSellerListingSummary(listing);
    }

    const canExposeToCustomers =
      seller.status === "ACTIVE" && listing.product.status === "ACTIVE";

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProductListing.update({
        where: {
          id: listingId
        },
        data: {
          status: "ACTIVE",
          isActive: canExposeToCustomers
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER_PRODUCT_LISTING",
          entityId: listingId,
          action: "SELLER_LISTING_REACTIVATED",
          details: {
            sellerSku: listing.sellerSku,
            isActive: canExposeToCustomers,
            note: `Seller reactivated offer ${listing.sellerSku}.`
          }
        }
      });
    });

    if (canExposeToCustomers) {
      await this.syncListings([listingId], viewer.id, "Seller offer reactivated.");
    } else {
      await this.invalidateStorefrontReadCaches();
    }

    const updatedListing = await this.prisma.sellerProductListing.findUniqueOrThrow({
      where: {
        id: listingId
      },
      include: sellerListingInclude.include
    });

    return mapSellerListingSummary(updatedListing);
  }

  async archiveListing(viewer: AuthenticatedUser, listingId: string) {
    const seller = await this.getSellerScope(viewer.id);
    const listing = await this.prisma.sellerProductListing.findFirst({
      where: {
        id: listingId,
        sellerId: seller.id
      },
      include: sellerListingInclude.include
    });

    if (!listing) {
      throw new NotFoundException(
        `Listing ${listingId} was not found for seller ${seller.displayName}.`
      );
    }

    if ((listing.inventoryItem?.reserved ?? 0) > 0) {
      throw new ConflictException(
        "Offers with reserved units cannot be archived until active reservations are released."
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.sellerProductListing.update({
        where: {
          id: listingId
        },
        data: {
          status: "ARCHIVED",
          isActive: false
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER_PRODUCT_LISTING",
          entityId: listingId,
          action: "SELLER_LISTING_ARCHIVED",
          details: {
            sellerSku: listing.sellerSku,
            note: `Seller archived offer ${listing.sellerSku}.`
          }
        }
      });
    });

    await this.removeListingsFromSearch(
      [listingId],
      viewer.id,
      "Seller offer archived."
    );
    await this.invalidateStorefrontReadCaches();

    const archivedListing = await this.prisma.sellerProductListing.findUniqueOrThrow(
      {
        where: {
          id: listingId
        },
        include: sellerListingInclude.include
      }
    );

    return mapSellerListingSummary(archivedListing);
  }

  async deleteCatalogProduct(viewer: AuthenticatedUser, productId: string) {
    const seller = await this.getSellerScope(viewer.id);
    const product = await this.prisma.product.findUnique({
      where: {
        id: productId
      },
      include: {
        orderItems: {
          select: {
            id: true
          },
          take: 1
        },
        listings: {
          select: {
            id: true,
            status: true,
            sellerSku: true,
            cartItems: {
              select: {
                id: true
              },
              take: 1
            },
            inventoryItem: {
              select: {
                reserved: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new NotFoundException(`Product ${productId} was not found.`);
    }

    if (product.ownerSellerId !== seller.id) {
      throw new ConflictException(
        "Only seller-owned catalog products can be deleted from the seller workspace."
      );
    }

    if (product.orderItems.length > 0) {
      throw new ConflictException(
        "Products that already appear in placed orders cannot be deleted. Archive the offer instead."
      );
    }

    if (product.listings.some((listing) => listing.status !== "ARCHIVED")) {
      throw new ConflictException(
        "Archive the seller-owned offer before deleting the product."
      );
    }

    if (
      product.listings.some((listing) => (listing.inventoryItem?.reserved ?? 0) > 0)
    ) {
      throw new ConflictException(
        "Products with reserved inventory cannot be deleted until active reservations are released."
      );
    }

    if (product.listings.some((listing) => listing.cartItems.length > 0)) {
      throw new ConflictException(
        "Products that still exist in active carts cannot be deleted. Remove or expire those carts first."
      );
    }

    const listingIds = product.listings.map((listing) => listing.id);

    await this.prisma.$transaction(async (tx) => {
      await tx.product.delete({
        where: {
          id: productId
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "PRODUCT",
          entityId: productId,
          action: "SELLER_PRODUCT_DELETED",
          details: {
            sellerId: seller.id,
            listingIds,
            note: `Seller deleted owned catalog product ${productId}.`
          }
        }
      });
    });

    await this.removeListingsFromSearch(
      listingIds,
      viewer.id,
      "Seller-owned catalog product deleted."
    );
    await this.invalidateStorefrontReadCaches();
    await this.notificationsService.notifyAdmins({
      kind: "OPERATIONS",
      level: "WARNING",
      title: "Seller catalog product deleted",
      message: `${seller.displayName} deleted the seller-owned product ${product.title}.`,
      linkUrl: `${this.adminUrl}#products`,
      actorUserId: viewer.id
    });

    return {
      deletedProductId: productId,
      deletedListingCount: listingIds.length
    };
  }

  async listOrders(viewer: AuthenticatedUser) {
    const seller = await this.getSellerScope(viewer.id);
    const orders = await this.prisma.order.findMany({
      where: {
        items: {
          some: {
            listing: {
              sellerId: seller.id
            }
          }
        }
      },
      include: sellerOrderInclude.include,
      orderBy: {
        updatedAt: "desc"
      },
      take: 24
    });

    return orders.map((order) => mapSellerOrderSummary(order, seller.id));
  }

  async getOrderDetail(viewer: AuthenticatedUser, number: string) {
    const seller = await this.getSellerScope(viewer.id);
    const order = await this.prisma.order.findFirst({
      where: {
        number,
        items: {
          some: {
            listing: {
              sellerId: seller.id
            }
          }
        }
      },
      include: sellerOrderInclude.include
    });

    if (!order) {
      throw new NotFoundException(`Order ${number} was not found.`);
    }

    return mapSellerOrderDetail(order, seller.id);
  }

  private async getSellerScope(userId: string) {
    const seller = await this.prisma.seller.findUnique({
      where: {
        ownerUserId: userId
      }
    });

    if (!seller) {
      throw new NotFoundException("No seller profile is linked to the active account.");
    }

    return seller;
  }

  private buildCategoryLabel(
    categoryId: string,
    categoryMap: Map<
      string,
      {
        id: string;
        name: string;
        parentId: string | null;
      }
    >
  ) {
    const path: string[] = [];
    let current = categoryMap.get(categoryId);

    while (current) {
      path.unshift(current.name);
      current = current.parentId ? categoryMap.get(current.parentId) : undefined;
    }

    return path.join(" / ");
  }

  private async ensureSellerSkuAvailable(sellerSku: string) {
    const existingListing = await this.prisma.sellerProductListing.findFirst({
      where: {
        sellerSku: sellerSku.trim()
      },
      select: {
        id: true
      }
    });

    if (existingListing) {
      throw new ConflictException(
        `Seller SKU ${sellerSku.trim()} is already assigned to another offer.`
      );
    }
  }

  private async resolveActiveCategoryWithinTransaction(
    tx: PrismaTransactionClient,
    categoryId: string
  ) {
    const category = await tx.category.findFirst({
      where: {
        id: categoryId,
        isActive: true
      },
      select: {
        id: true,
        name: true
      }
    });

    if (!category) {
      throw new NotFoundException(
        `Category ${categoryId} is not available for seller-created products.`
      );
    }

    return category;
  }

  private async resolveBrandIdWithinTransaction(
    tx: PrismaTransactionClient,
    brandName: string | null
  ) {
    const normalizedBrandName = brandName?.trim();

    if (!normalizedBrandName) {
      return null;
    }

    const brandSlug = slugify(normalizedBrandName);
    const existingBrand = await tx.brand.findUnique({
      where: {
        slug: brandSlug
      },
      select: {
        id: true
      }
    });

    if (existingBrand) {
      return existingBrand.id;
    }

    const createdBrand = await tx.brand.create({
      data: {
        name: normalizedBrandName,
        slug: brandSlug
      },
      select: {
        id: true
      }
    });

    return createdBrand.id;
  }

  private async generateUniqueProductSlug(
    tx: PrismaTransactionClient,
    title: string,
    sellerSlug: string
  ) {
    const baseSlug = slugify(title) || "seller-product";
    let candidate = `${baseSlug}-${sellerSlug}`;
    let suffix = 2;

    while (
      await tx.product.findUnique({
        where: {
          slug: candidate
        },
        select: {
          id: true
        }
      })
    ) {
      candidate = `${baseSlug}-${sellerSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
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

    if (documents.length === 0) {
      return;
    }

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
    await this.auditService.record(
      actorUserId,
      "SEARCH_DOCUMENT",
      documents[0]?.listingId ?? listingIds[0] ?? "seller-sync",
      "SEARCH_SYNC_UPDATED",
      {
        listings: listingIds,
        message
      }
    );
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

  private async invalidateStorefrontReadCaches() {
    await this.cacheService.deleteByPrefix(["catalog:", "search:query:"]);
  }
}
