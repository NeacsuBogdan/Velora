import {
  Prisma,
  type JobStatus,
  type OrderStatus,
  type Price,
  type SearchSyncStatus,
  type WebhookDeliveryStatus
} from "@prisma/client";
import {
  adminAuditLogSummarySchema,
  adminCategorySummarySchema,
  adminCustomerSummarySchema,
  adminInventoryItemSchema,
  adminOrderDetailSchema,
  adminOrderSummarySchema,
  adminReindexJobSummarySchema,
  adminSearchSyncLogSchema,
  adminSellerSummarySchema,
  adminWebhookDeliverySummarySchema,
  adminProductSummarySchema,
  type AdminProductSummary
} from "@velora/contracts";

import { calculateAvailableQuantity } from "../search/search.helpers";

function resolveActivePrice(prices: Price[], now = new Date()) {
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

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

export function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export const adminProductInclude =
  Prisma.validator<Prisma.ProductDefaultArgs>()({
    include: {
      brand: true,
      category: true,
      media: {
        orderBy: {
          sortOrder: "asc"
        }
      },
      listings: {
        orderBy: {
          createdAt: "asc"
        },
        include: {
          seller: true,
          variant: true,
          inventoryItem: true,
          prices: {
            orderBy: {
              createdAt: "desc"
            }
          }
        }
      }
    }
  });

export type AdminProductRecord = Prisma.ProductGetPayload<
  typeof adminProductInclude
>;

export function selectPrimaryListing(product: AdminProductRecord) {
  return (
    product.listings.find((listing) => listing.isActive && listing.status !== "ARCHIVED") ??
    product.listings[0] ??
    null
  );
}

export function mapAdminProductSummary(product: AdminProductRecord): AdminProductSummary {
  const listing = selectPrimaryListing(product);
  const price = listing ? resolveActivePrice(listing.prices) : null;
  const inventory = listing?.inventoryItem ?? null;

  return adminProductSummarySchema.parse({
    productId: product.id,
    listingId: listing?.id ?? null,
    title: product.title,
    slug: product.slug,
    description: product.description,
    status: product.status,
    categoryId: product.categoryId ?? null,
    categoryName: product.category?.name ?? null,
    brandName: product.brand?.name ?? null,
    sellerId: listing?.sellerId ?? null,
    sellerName: listing?.seller.displayName ?? null,
    sellerSku: listing?.sellerSku ?? null,
    variantTitle: listing?.variant?.title ?? null,
    leadTimeDays: listing?.leadTimeDays ?? null,
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
    inventory: inventory
      ? {
          onHand: inventory.onHand,
          reserved: inventory.reserved,
          safetyStock: inventory.safetyStock,
          availableQuantity: calculateAvailableQuantity(inventory)
        }
      : null,
    listingCount: product.listings.length,
    image: product.media[0]
      ? {
          url: product.media[0].url,
          altText: product.media[0].altText
        }
      : null,
    updatedAt: product.updatedAt.toISOString()
  });
}

export const adminInventoryInclude =
  Prisma.validator<Prisma.InventoryItemDefaultArgs>()({
    include: {
      listing: {
        include: {
          seller: true,
          product: true
        }
      }
    }
  });

export type AdminInventoryRecord = Prisma.InventoryItemGetPayload<
  typeof adminInventoryInclude
>;

export function mapAdminInventoryItem(item: AdminInventoryRecord) {
  return adminInventoryItemSchema.parse({
    inventoryItemId: item.id,
    listingId: item.listingId,
    productId: item.listing.productId,
    productTitle: item.listing.product.title,
    productSlug: item.listing.product.slug,
    sellerId: item.listing.sellerId,
    sellerName: item.listing.seller.displayName,
    sellerSku: item.listing.sellerSku,
    status: item.listing.product.status,
    onHand: item.onHand,
    reserved: item.reserved,
    safetyStock: item.safetyStock,
    availableQuantity: calculateAvailableQuantity(item),
    leadTimeDays: item.listing.leadTimeDays,
    updatedAt: item.updatedAt.toISOString()
  });
}

export const adminOrderInclude =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
      user: true,
      seller: true,
      discountSnapshots: {
        orderBy: {
          createdAt: "asc"
        }
      },
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

export type AdminOrderRecord = Prisma.OrderGetPayload<typeof adminOrderInclude>;

function mapOrderParty(
  value:
    | {
        id: string;
        email?: string | null;
        displayName?: string | null;
      }
    | null
    | undefined,
  fallback?: string | null
) {
  if (!value) {
    return null;
  }

  return {
    id: value.id,
    label: value.email ?? value.displayName ?? fallback ?? value.id
  };
}

export function mapAdminOrderSummary(order: AdminOrderRecord) {
  return adminOrderSummarySchema.parse({
    orderId: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: {
      amount: order.total,
      currency: order.currency
    },
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    customer: mapOrderParty(
      order.user
        ? {
            id: order.user.id,
            email: order.user.email
          }
        : null
    ),
    seller: mapOrderParty(
      order.seller
        ? {
            id: order.seller.id,
            displayName: order.seller.displayName
          }
        : null,
      order.items[0]?.sellerNameSnapshot ?? null
    ),
    createdAt: order.createdAt.toISOString(),
    placedAt: order.placedAt?.toISOString() ?? null,
    updatedAt: order.updatedAt.toISOString()
  });
}

export function mapAdminOrderDetail(order: AdminOrderRecord) {
  const summary = mapAdminOrderSummary(order);

  return adminOrderDetailSchema.parse({
    ...summary,
    subtotal: {
      amount: order.subtotal,
      currency: order.currency
    },
    discountTotal: {
      amount: order.discountTotal,
      currency: order.currency
    },
    items: order.items.map((item) => ({
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
    discounts: order.discountSnapshots.map((discount) => ({
      promotionId: discount.promotionId ?? null,
      couponCode: discount.couponCode ?? null,
      label: discount.label,
      amount: {
        amount: discount.amount,
        currency: discount.currency
      },
      description:
        typeof discount.metadata === "object" &&
        discount.metadata &&
        "description" in discount.metadata &&
        typeof discount.metadata.description === "string"
          ? discount.metadata.description
          : null
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

export const adminCustomerInclude =
  Prisma.validator<Prisma.UserDefaultArgs>()({
    include: {
      roleAssignments: {
        include: {
          role: true
        }
      },
      orders: {
        orderBy: {
          createdAt: "desc"
        }
      }
    }
  });

export type AdminCustomerRecord = Prisma.UserGetPayload<
  typeof adminCustomerInclude
>;

export function mapAdminCustomerSummary(customer: AdminCustomerRecord) {
  const totalSpent = customer.orders
    .filter((order) => order.status !== "CANCELED")
    .reduce((sum, order) => sum + order.total, 0);

  return adminCustomerSummarySchema.parse({
    userId: customer.id,
    email: customer.email,
    fullName: `${customer.firstName} ${customer.lastName}`.trim(),
    isActive: customer.isActive,
    roles: customer.roleAssignments.map((assignment) => assignment.role.code),
    orderCount: customer.orders.length,
    totalSpent: {
      amount: totalSpent,
      currency: customer.orders[0]?.currency ?? "RON"
    },
    lastOrderAt: customer.orders[0]?.createdAt.toISOString() ?? null,
    createdAt: customer.createdAt.toISOString()
  });
}

export const adminSellerInclude =
  Prisma.validator<Prisma.SellerDefaultArgs>()({
    include: {
      ownerUser: true,
      listings: {
        include: {
          inventoryItem: true
        }
      }
    }
  });

export type AdminSellerRecord = Prisma.SellerGetPayload<typeof adminSellerInclude>;

export function mapAdminSellerSummary(seller: AdminSellerRecord) {
  const lowStockListings = seller.listings.filter((listing) => {
    const inventoryItem = listing.inventoryItem;
    return inventoryItem ? calculateAvailableQuantity(inventoryItem) <= 5 : true;
  }).length;

  return adminSellerSummarySchema.parse({
    sellerId: seller.id,
    slug: seller.slug,
    displayName: seller.displayName,
    legalName: seller.legalName,
    contactEmail: seller.contactEmail,
    status: seller.status,
    ownerUserEmail: seller.ownerUser?.email ?? null,
    listingCount: seller.listings.length,
    activeListings: seller.listings.filter((listing) => listing.isActive).length,
    lowStockListings,
    updatedAt: seller.updatedAt.toISOString()
  });
}

export function mapAdminCategorySummary(
  category: {
    id: string;
    name: string;
    slug: string;
    description: string;
    parentId: string | null;
    parent: { name: string } | null;
    sortOrder: number;
    isActive: boolean;
    updatedAt: Date;
    _count: { products: number; children: number };
  }
) {
  return adminCategorySummarySchema.parse({
    categoryId: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    parentId: category.parentId,
    parentName: category.parent?.name ?? null,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    productCount: category._count.products,
    childCount: category._count.children,
    updatedAt: category.updatedAt.toISOString()
  });
}

export function mapAdminReindexJobSummary(
  job: {
    id: string;
    scope: string;
    status: JobStatus;
    createdAt: Date;
    startedAt: Date | null;
    finishedAt: Date | null;
    errorMessage: string | null;
    requestedByUser: { email: string } | null;
  }
) {
  return adminReindexJobSummarySchema.parse({
    jobId: job.id,
    scope: job.scope,
    status: job.status,
    requestedByEmail: job.requestedByUser?.email ?? null,
    createdAt: job.createdAt.toISOString(),
    startedAt: job.startedAt?.toISOString() ?? null,
    finishedAt: job.finishedAt?.toISOString() ?? null,
    errorMessage: job.errorMessage ?? null
  });
}

export function mapAdminSearchSyncLog(
  log: {
    id: string;
    listingId: string | null;
    documentId: string | null;
    status: SearchSyncStatus;
    message: string | null;
    createdAt: Date;
  }
) {
  return adminSearchSyncLogSchema.parse({
    logId: log.id,
    listingId: log.listingId ?? null,
    documentId: log.documentId ?? null,
    status: log.status,
    message: log.message ?? null,
    createdAt: log.createdAt.toISOString()
  });
}

export function mapAdminAuditLogSummary(
  auditLog: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    createdAt: Date;
    actorUser: { email: string } | null;
  }
) {
  return adminAuditLogSummarySchema.parse({
    auditLogId: auditLog.id,
    actorEmail: auditLog.actorUser?.email ?? null,
    entityType: auditLog.entityType,
    entityId: auditLog.entityId,
    action: auditLog.action,
    createdAt: auditLog.createdAt.toISOString()
  });
}

export function mapAdminWebhookDeliverySummary(
  delivery: {
    id: string;
    provider: string;
    externalEventId: string;
    status: WebhookDeliveryStatus;
    receivedAt: Date;
    processedAt: Date | null;
  }
) {
  return adminWebhookDeliverySummarySchema.parse({
    webhookDeliveryId: delivery.id,
    provider: delivery.provider,
    externalEventId: delivery.externalEventId,
    status: delivery.status,
    receivedAt: delivery.receivedAt.toISOString(),
    processedAt: delivery.processedAt?.toISOString() ?? null
  });
}

export const allowedOrderStatusTransitions: Record<OrderStatus, OrderStatus[]> = {
  CREATED: ["PAYMENT_PENDING", "CANCELED"],
  PAYMENT_PENDING: ["PAID", "CANCELED"],
  PAID: ["PROCESSING", "REFUNDED"],
  PROCESSING: ["SHIPPED", "CANCELED", "REFUNDED"],
  SHIPPED: ["COMPLETED", "REFUNDED"],
  COMPLETED: ["REFUNDED"],
  CANCELED: [],
  REFUNDED: []
};

export function canTransitionOrderStatus(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus
) {
  return currentStatus === nextStatus
    ? true
    : allowedOrderStatusTransitions[currentStatus].includes(nextStatus);
}
