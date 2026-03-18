import { Prisma } from "@prisma/client";
import { orderDetailSchema, orderSummarySchema } from "@velora/contracts";

import {
  parseCheckoutAddressSnapshot,
  parseCheckoutContactSnapshot
} from "../checkout/checkout.helpers";
import { parseOrderSettlementSnapshot } from "./order-settlement.helpers";

export const orderSummaryInclude =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
      items: {
        select: {
          id: true,
          quantity: true
        }
      }
    }
  });

export type OrderSummaryRecord = Prisma.OrderGetPayload<typeof orderSummaryInclude>;

export const orderDetailInclude =
  Prisma.validator<Prisma.OrderDefaultArgs>()({
    include: {
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

export type OrderDetailRecord = Prisma.OrderGetPayload<typeof orderDetailInclude>;

export function mapOrderSummary(order: OrderSummaryRecord) {
  return orderSummarySchema.parse({
    orderId: order.id,
    number: order.number,
    status: order.status,
    paymentStatus: order.paymentStatus,
    total: {
      amount: order.total,
      currency: order.currency
    },
    subtotal: {
      amount: order.subtotal,
      currency: order.currency
    },
    discountTotal: {
      amount: order.discountTotal,
      currency: order.currency
    },
    itemCount: order.items.reduce((count, item) => count + item.quantity, 0),
    createdAt: order.createdAt.toISOString(),
    placedAt: order.placedAt?.toISOString() ?? null
  });
}

export function mapOrderDetail(order: OrderDetailRecord) {
  const summary = mapOrderSummary(order);

  return orderDetailSchema.parse({
    ...summary,
    customer: parseCheckoutContactSnapshot(order.customerSnapshot),
    deliveryAddress: parseCheckoutAddressSnapshot(
      order.deliveryAddressSnapshot
    ),
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
      fundingSource: discount.fundingSource,
      sellerFundedAmount: {
        amount: discount.sellerFundedAmount,
        currency: discount.currency
      },
      platformFundedAmount: {
        amount: discount.platformFundedAmount,
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
    settlement: parseOrderSettlementSnapshot(order.settlementSnapshot),
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
