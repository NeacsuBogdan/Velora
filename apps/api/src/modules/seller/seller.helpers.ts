import { Prisma, type Price } from "@prisma/client";
import {
  sellerListingCatalogOptionSchema,
  sellerListingSummarySchema,
  sellerOrderDetailSchema,
  sellerOrderSummarySchema
} from "@velora/contracts";

import { calculateAvailableQuantity } from "../search/search.helpers";

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function resolveActivePrice(prices: Price[], now = new Date()) {
  return (
    prices
      .filter((price) => {
        const startsAtValid = price.startsAt ? price.startsAt <= now : true;
        const endsAtValid = price.endsAt ? price.endsAt >= now : true;
        return startsAtValid && endsAtValid;
      })
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ??
    null
  );
}

export const sellerListingInclude =
  Prisma.validator<Prisma.SellerProductListingDefaultArgs>()({
    include: {
      product: {
        include: {
          brand: true,
          category: true,
          media: {
            orderBy: {
              sortOrder: "asc"
            }
          }
        }
      },
      variant: true,
      inventoryItem: true,
      prices: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

export type SellerListingRecord = Prisma.SellerProductListingGetPayload<
  typeof sellerListingInclude
>;

export const sellerCatalogOptionInclude =
  Prisma.validator<Prisma.ProductDefaultArgs>()({
    include: {
      brand: true,
      category: true,
      media: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      variants: {
        orderBy: {
          createdAt: "asc"
        }
      },
      listings: {
        select: {
          sellerId: true,
          status: true
        }
      }
    }
  });

export type SellerCatalogOptionRecord = Prisma.ProductGetPayload<
  typeof sellerCatalogOptionInclude
>;

export function mapSellerListingCatalogOption(
  product: SellerCatalogOptionRecord,
  sellerId: string
) {
  return sellerListingCatalogOptionSchema.parse({
    productId: product.id,
    slug: product.slug,
    title: product.title,
    categoryName: product.category?.name ?? null,
    brandName: product.brand?.name ?? null,
    image: product.media[0]
      ? {
          url: product.media[0].url,
          altText: product.media[0].altText
        }
      : null,
    sellerListingCount: product.listings.filter(
      (listing) => listing.sellerId === sellerId && listing.status !== "ARCHIVED"
    ).length,
    variants: product.variants.map((variant) => ({
      variantId: variant.id,
      title: variant.title,
      isDefault: variant.isDefault
    }))
  });
}

export function mapSellerListingSummary(listing: SellerListingRecord) {
  const price = resolveActivePrice(listing.prices);
  const inventory = listing.inventoryItem;

  if (!inventory) {
    throw new Error(`Listing ${listing.id} is missing inventory.`);
  }

  return sellerListingSummarySchema.parse({
    listingId: listing.id,
    inventoryItemId: inventory.id,
    productId: listing.productId,
    slug: listing.product.slug,
    title: listing.product.title,
    productDescription: listing.product.description,
    categoryId: listing.product.categoryId,
    categoryName: listing.product.category?.name ?? null,
    brandName: listing.product.brand?.name ?? null,
    variantTitle: listing.variant?.title ?? null,
    sellerSku: listing.sellerSku,
    status: listing.status,
    isActive: listing.isActive,
    leadTimeDays: listing.leadTimeDays,
    canEditProductContent: listing.product.ownerSellerId === listing.sellerId,
    productOwnership: listing.product.ownerSellerId ? "SELLER" : "PLATFORM",
    price: price
      ? {
          amount: price.amount,
          currency: price.currency
        }
      : null,
    compareAtPrice:
      price?.compareAtAmount !== null && price?.compareAtAmount !== undefined
        ? {
            amount: price.compareAtAmount,
            currency: price.currency
          }
        : null,
    inventory: {
      onHand: inventory.onHand,
      reserved: inventory.reserved,
      safetyStock: inventory.safetyStock,
      availableQuantity: calculateAvailableQuantity(inventory)
    },
    image: listing.product.media[0]
      ? {
          url: listing.product.media[0].url,
          altText: listing.product.media[0].altText
        }
      : null,
    updatedAt: listing.updatedAt.toISOString()
  });
}

export const sellerOrderInclude =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
      user: true,
      items: {
        include: {
          listing: {
            include: {
              seller: true
            }
          },
          product: true
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      paymentAttempt: {
        include: {
          refunds: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      },
      statusHistory: {
        orderBy: {
          createdAt: "asc"
        }
      }
    }
  });

export type SellerOrderRecord = Prisma.OrderGetPayload<typeof sellerOrderInclude>;

function getSellerScopedItems(order: SellerOrderRecord, sellerId: string) {
  return order.items.filter((item) => item.listing.sellerId === sellerId);
}

function calculateSellerScopedTotals(order: SellerOrderRecord, sellerId: string) {
  const scopedItems = getSellerScopedItems(order, sellerId);
  const scopedSubtotal = scopedItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const sourceSubtotal =
    order.subtotal > 0
      ? order.subtotal
      : order.items.reduce((sum, item) => sum + item.totalPrice, 0);
  const scopedDiscountTotal =
    order.discountTotal > 0 && sourceSubtotal > 0 && scopedSubtotal > 0
      ? Math.min(
          scopedSubtotal,
          Math.round(order.discountTotal * (scopedSubtotal / sourceSubtotal))
        )
      : 0;

  return {
    scopedItems,
    itemCount: scopedItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: scopedSubtotal,
    discountTotal: scopedDiscountTotal,
    total: Math.max(scopedSubtotal - scopedDiscountTotal, 0)
  };
}

function mapSellerCustomer(
  user:
    | {
        email: string;
        firstName: string;
        lastName: string;
      }
    | null
    | undefined
) {
  if (!user) {
    return {
      label: "Guest checkout",
      email: null
    };
  }

  const fullName = `${user.firstName} ${user.lastName}`.trim();

  return {
    label: fullName.length > 0 ? fullName : user.email,
    email: user.email
  };
}

export function mapSellerOrderSummary(order: SellerOrderRecord, sellerId: string) {
  const totals = calculateSellerScopedTotals(order, sellerId);

  return sellerOrderSummarySchema.parse({
    orderId: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    customer: mapSellerCustomer(order.user),
    itemCount: totals.itemCount,
    subtotal: {
      amount: totals.subtotal,
      currency: order.currency
    },
    discountTotal: {
      amount: totals.discountTotal,
      currency: order.currency
    },
    total: {
      amount: totals.total,
      currency: order.currency
    },
    createdAt: order.createdAt.toISOString(),
    placedAt: order.placedAt?.toISOString() ?? null
  });
}

export function mapSellerOrderDetail(order: SellerOrderRecord, sellerId: string) {
  const summary = mapSellerOrderSummary(order, sellerId);
  const totals = calculateSellerScopedTotals(order, sellerId);

  return sellerOrderDetailSchema.parse({
    ...summary,
    items: totals.scopedItems.map((item) => ({
      orderItemId: item.id,
      listingId: item.listingId,
      productId: item.productId,
      slug: item.product.slug,
      title: item.productTitleSnapshot,
      seller: {
        slug: item.listing.seller.slug,
        name: item.sellerNameSnapshot
      },
      quantity: item.quantity,
      unitPrice: {
        amount: item.unitPrice,
        currency: order.currency
      },
      totalPrice: {
        amount: item.totalPrice,
        currency: order.currency
      }
    })),
    statusHistory: order.statusHistory.map((entry) => ({
      status: entry.status,
      note: entry.note ?? null,
      createdAt: entry.createdAt.toISOString()
    })),
    refunds: order.paymentAttempt?.refunds.map((refund) => ({
      refundId: refund.id,
      amount: {
        amount: refund.amount,
        currency: refund.currency
      },
      status: refund.status,
      reason: refund.reason ?? null,
      createdAt: refund.createdAt.toISOString()
    })) ?? []
  });
}
