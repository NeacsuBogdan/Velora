import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import type { AuthenticatedUser } from "@velora/contracts";
import {
  createSellerListingRequestSchema,
  sellerDashboardSchema,
  updateSellerInventoryRequestSchema,
  updateSellerListingCommercialRequestSchema
} from "@velora/contracts";

import { AuditService } from "../audit/audit.service";
import { PrismaService } from "../database/prisma.service";
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
  sellerCatalogOptionInclude,
  sellerListingInclude,
  sellerOrderInclude
} from "./seller.helpers";

@Injectable()
export class SellerService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly projectionService: SearchProjectionService,
    private readonly openSearchService: OpenSearchService,
    private readonly cacheService: PlatformCacheService
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
        status: "ACTIVE"
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
