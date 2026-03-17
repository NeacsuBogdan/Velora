import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { Stripe } from "stripe";
import { Prisma, type PaymentStatus } from "@prisma/client";
import {
  confirmPaymentAttemptRequestSchema,
  createPaymentAttemptRequestSchema,
  domainOverviewSchema,
  paymentAttemptSummarySchema,
  paymentConfirmationResponseSchema,
  refundRequestSchema,
  webhookAckSchema,
  type AuthenticatedUser
} from "@velora/contracts";

import { AuditService } from "../audit/audit.service";
import { CheckoutService } from "../checkout/checkout.service";
import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  mapOrderDetail,
  orderDetailInclude
} from "../orders/order.helpers";
import { pricingSnapshotSchema } from "../promotions/pricing.helpers";

type PrismaTransactionClient = Prisma.TransactionClient;

interface NormalizedProviderEvent {
  eventId: string;
  type: string;
  payload: Record<string, unknown>;
  paymentIntentId: string | null;
  status: PaymentStatus;
}

interface ProviderIntentResult {
  providerPaymentIntentId: string;
  clientSecret: string | null;
}

interface ConfirmIntentResult extends ProviderIntentResult {
  event: NormalizedProviderEvent;
}

interface NotificationPlan {
  userId: string;
  kind: "ORDER" | "REFUND";
  level: "SUCCESS" | "INFO";
  title: string;
  message: string;
  linkUrl: string;
}

const PAYMENT_PROVIDER = "stripe";

const settlementInclude =
  Prisma.validator<Prisma.PaymentAttemptDefaultArgs>()({
    include: {
      checkoutSession: {
        include: {
          cart: {
            include: {
              items: {
                include: {
                  listing: {
                    include: {
                      seller: true,
                      product: true,
                      variant: true
                    }
                  }
                },
                orderBy: {
                  createdAt: "asc"
                }
              }
            }
          },
          reservations: {
            where: {
              status: "ACTIVE"
            },
            include: {
              inventoryItem: true
            },
            orderBy: {
              createdAt: "asc"
            }
          },
          order: {
            include: {
              items: {
                select: {
                  id: true,
                  quantity: true
                }
              }
            }
          }
        }
      }
    }
  });

@Injectable()
export class PaymentsService {
  private readonly stripeSecretKey =
    process.env.STRIPE_SECRET_KEY ?? "sk_test_placeholder";
  private readonly stripeWebhookSecret =
    process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_placeholder";
  private readonly stripe = this.isStripeConfigured()
    ? new Stripe(this.stripeSecretKey)
    : null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly checkoutService: CheckoutService,
    private readonly inventoryService: InventoryService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService
  ) {}

  async getOverview() {
    const [attemptCount, eventCount, refundCount, webhookCount] =
      await Promise.all([
        this.prisma.paymentAttempt.count(),
        this.prisma.paymentEvent.count(),
        this.prisma.refundRecord.count(),
        this.prisma.webhookDeliveryRecord.count()
      ]);

    return domainOverviewSchema.parse({
      scope: "payments",
      metrics: {
        attempts: attemptCount,
        events: eventCount,
        refunds: refundCount,
        webhooks: webhookCount
      },
      notes: [
        this.isStripeConfigured()
          ? "Stripe sandbox integration is active for PaymentIntent creation and confirmation."
          : "Stripe keys are placeholders, so the local deterministic payment sandbox is active."
      ]
    });
  }

  async createPaymentAttempt(
    viewer: AuthenticatedUser,
    checkoutSessionId: string,
    rawInput: unknown
  ) {
    const input = createPaymentAttemptRequestSchema.parse(rawInput);
    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    return this.prisma.$transaction(async (tx) => {
      const checkoutSession = await tx.checkoutSession.findFirst({
        where: {
          id: checkoutSessionId,
          userId: viewer.id
        },
        include: {
          order: true,
          reservations: {
            where: {
              status: "ACTIVE"
            },
            select: {
              id: true,
              quantity: true
            }
          }
        }
      });

      if (!checkoutSession) {
        throw new NotFoundException(
          `Checkout session ${checkoutSessionId} was not found.`
        );
      }

      if (checkoutSession.order) {
        throw new BadRequestException(
          "This checkout session has already been converted into an order."
        );
      }

      if (
        checkoutSession.reservationExpiresAt &&
        checkoutSession.reservationExpiresAt <= new Date()
      ) {
        await this.inventoryService.releaseReservationsForCheckoutSessionWithinTransaction(
          tx,
          checkoutSession.id,
          viewer.id,
          "Reservation expired before payment attempt creation."
        );
        await tx.checkoutSession.update({
          where: {
            id: checkoutSession.id
          },
          data: {
            status: "EXPIRED"
          }
        });

        throw new BadRequestException(
          "The reservation window has expired. Start checkout again from the cart."
        );
      }

      if (checkoutSession.reservations.length === 0) {
        throw new BadRequestException(
          "This checkout session has no active reservations."
        );
      }

      const existingAttempt = await tx.paymentAttempt.findFirst({
        where: {
          provider: PAYMENT_PROVIDER,
          idempotencyKey,
          checkoutSessionId
        }
      });

      if (existingAttempt) {
        return paymentAttemptSummarySchema.parse({
          attemptId: existingAttempt.id,
          checkoutSessionId: existingAttempt.checkoutSessionId,
          provider: existingAttempt.provider,
          providerPaymentIntentId:
            existingAttempt.providerPaymentIntentId ?? null,
          clientSecret: null,
          status: existingAttempt.status,
          amount: {
            amount: existingAttempt.amount,
            currency: existingAttempt.currency
          },
          createdAt: existingAttempt.createdAt.toISOString(),
          updatedAt: existingAttempt.updatedAt.toISOString()
        });
      }

      const intent = await this.createProviderIntent(
        checkoutSession.id,
        checkoutSession.amount,
        checkoutSession.currency,
        idempotencyKey
      );

      const paymentAttempt = await tx.paymentAttempt.create({
        data: {
          checkoutSessionId,
          provider: PAYMENT_PROVIDER,
          providerPaymentIntentId: intent.providerPaymentIntentId,
          idempotencyKey,
          status: "PENDING",
          amount: checkoutSession.amount,
          currency: checkoutSession.currency
        }
      });

      await tx.checkoutSession.update({
        where: {
          id: checkoutSessionId
        },
        data: {
          status: "PAYMENT_PENDING"
        }
      });

      await this.auditService.record(
        viewer.id,
        "PAYMENT_ATTEMPT",
        paymentAttempt.id,
        "PAYMENT_ATTEMPT_CREATED",
        {
          checkoutSessionId,
          idempotencyKey,
          providerPaymentIntentId: intent.providerPaymentIntentId
        }
      );

      return paymentAttemptSummarySchema.parse({
        attemptId: paymentAttempt.id,
        checkoutSessionId: paymentAttempt.checkoutSessionId,
        provider: paymentAttempt.provider,
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId ?? null,
        clientSecret: intent.clientSecret,
        status: paymentAttempt.status,
        amount: {
          amount: paymentAttempt.amount,
          currency: paymentAttempt.currency
        },
        createdAt: paymentAttempt.createdAt.toISOString(),
        updatedAt: paymentAttempt.updatedAt.toISOString()
      });
    });
  }

  async confirmPaymentAttempt(
    viewer: AuthenticatedUser,
    attemptId: string,
    rawInput: unknown
  ) {
    const input = confirmPaymentAttemptRequestSchema.parse(rawInput);
    const paymentAttempt = await this.prisma.paymentAttempt.findUnique({
      where: {
        id: attemptId
      },
      include: {
        checkoutSession: {
          select: {
            id: true,
            userId: true
          }
        }
      }
    });

    if (!paymentAttempt || paymentAttempt.checkoutSession.userId !== viewer.id) {
      throw new NotFoundException(`Payment attempt ${attemptId} was not found.`);
    }

    if (paymentAttempt.status === "SUCCEEDED") {
      return this.buildConfirmationResponse(
        paymentAttempt.id,
        "The payment was already settled successfully."
      );
    }

    const confirmation = await this.confirmProviderIntent(paymentAttempt, input.scenario);
    await this.processProviderEvent(confirmation.event, null);

    return this.buildConfirmationResponse(
      paymentAttempt.id,
      confirmation.event.type === "payment_intent.succeeded"
        ? "Payment settled and the order was created."
        : confirmation.event.type === "payment_intent.payment_failed"
          ? "Payment failed. The reservation is still active until it expires."
          : "Payment requires additional customer action."
    );
  }

  async handleStripeWebhook(rawBody: Buffer | string | undefined, signature?: string) {
    if (!rawBody) {
      throw new BadRequestException("Stripe webhook payload is missing.");
    }

    const event = this.parseStripeWebhook(rawBody, signature);
    return this.processProviderEvent(event, signature ?? null);
  }

  async createRefund(
    viewer: AuthenticatedUser,
    orderId: string,
    rawInput: unknown
  ) {
    const input = refundRequestSchema.parse(rawInput);

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId
      },
      include: orderDetailInclude.include
    });

    if (!order || !order.paymentAttempt) {
      throw new NotFoundException(`Order ${orderId} was not found.`);
    }

    const paymentAttempt = order.paymentAttempt;
    const refundedAmount = order.paymentAttempt.refunds.reduce(
      (sum, refund) =>
        refund.status === "FAILED" ? sum : sum + refund.amount,
      0
    );
    const remainingAmount = order.total - refundedAmount;
    const amount = input.amount ?? remainingAmount;

    if (amount <= 0 || amount > remainingAmount) {
      throw new BadRequestException(
        "Refund amount exceeds the remaining refundable total."
      );
    }

    const refundResult = await this.createProviderRefund(
      paymentAttempt.providerPaymentIntentId,
      amount
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.refundRecord.create({
        data: {
          paymentAttemptId: order.paymentAttemptId!,
          amount,
          currency: order.currency,
          reason: input.reason,
          externalRefundId: refundResult.externalRefundId,
          status: refundResult.status
        }
      });

      const nextRefundedAmount = refundedAmount + amount;
      const isFullRefund = nextRefundedAmount >= order.total;
      const nextPaymentStatus: PaymentStatus = isFullRefund
        ? "REFUNDED"
        : "PARTIALLY_REFUNDED";

      await tx.paymentAttempt.update({
        where: {
          id: order.paymentAttemptId!
        },
        data: {
          status: nextPaymentStatus
        }
      });

      await tx.order.update({
        where: {
          id: order.id
        },
        data: {
          paymentStatus: nextPaymentStatus,
          status: isFullRefund ? "REFUNDED" : order.status
        }
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          actorUserId: viewer.id,
          status: isFullRefund ? "REFUNDED" : order.status,
          note: isFullRefund
            ? `Full refund recorded for ${amount / 100} ${order.currency}.`
            : `Partial refund recorded for ${amount / 100} ${order.currency}.`
        }
      });

      await tx.paymentEvent.create({
        data: {
          paymentAttemptId: order.paymentAttemptId!,
          externalEventId: `refund:${refundResult.externalRefundId}`,
          type: "charge.refunded",
          payload: {
            amount,
            currency: order.currency,
            paymentIntentId: paymentAttempt.providerPaymentIntentId,
            externalRefundId: refundResult.externalRefundId
          } as Prisma.InputJsonValue,
          status: nextPaymentStatus
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "ORDER",
          entityId: order.id,
          action: "ORDER_REFUNDED",
          details: {
            amount,
            fullRefund: isFullRefund,
            externalRefundId: refundResult.externalRefundId
          }
        }
      });
    });

    const refreshedOrder = await this.prisma.order.findUnique({
      where: {
        id: order.id
      },
      include: orderDetailInclude.include
    });

    if (!refreshedOrder) {
      throw new NotFoundException(`Order ${orderId} was not found.`);
    }

    await this.dispatchNotificationPlans(
      this.buildRefundNotificationPlans(refreshedOrder, amount)
    );

    return mapOrderDetail(refreshedOrder);
  }

  private async buildConfirmationResponse(
    paymentAttemptId: string,
    message: string
  ) {
    const paymentAttempt = await this.prisma.paymentAttempt.findUnique({
      where: {
        id: paymentAttemptId
      }
    });

    if (!paymentAttempt) {
      throw new NotFoundException(
        `Payment attempt ${paymentAttemptId} was not found.`
      );
    }

    const checkout = await this.checkoutService.getCheckoutSessionDetailById(
      paymentAttempt.checkoutSessionId
    );

    return paymentConfirmationResponseSchema.parse({
      attempt: paymentAttemptSummarySchema.parse({
        attemptId: paymentAttempt.id,
        checkoutSessionId: paymentAttempt.checkoutSessionId,
        provider: paymentAttempt.provider,
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId ?? null,
        clientSecret: null,
        status: paymentAttempt.status,
        amount: {
          amount: paymentAttempt.amount,
          currency: paymentAttempt.currency
        },
        createdAt: paymentAttempt.createdAt.toISOString(),
        updatedAt: paymentAttempt.updatedAt.toISOString()
      }),
      checkout,
      order: checkout.order,
      message
    });
  }

  private async processProviderEvent(
    event: NormalizedProviderEvent,
    signature: string | null
  ) {
    const result = await this.prisma.$transaction(async (tx) => {
      let notificationPlans: NotificationPlan[] = [];
      const existingDelivery = await tx.webhookDeliveryRecord.findUnique({
        where: {
          provider_externalEventId: {
            provider: PAYMENT_PROVIDER,
            externalEventId: event.eventId
          }
        }
      });

      if (existingDelivery) {
        return {
          ack: webhookAckSchema.parse({
            provider: PAYMENT_PROVIDER,
            eventId: event.eventId,
            duplicate: true,
            processed: true
          }),
          notificationPlans: []
        };
      }

      const deliveryRecord = await tx.webhookDeliveryRecord.create({
        data: {
          provider: PAYMENT_PROVIDER,
          externalEventId: event.eventId,
          signature: signature ?? undefined,
          payload: event.payload as Prisma.InputJsonValue,
          status: "RECEIVED"
        }
      });

      const paymentAttempt = event.paymentIntentId
        ? await tx.paymentAttempt.findUnique({
            where: {
              providerPaymentIntentId: event.paymentIntentId
            }
          })
        : null;

      if (!paymentAttempt) {
        await tx.webhookDeliveryRecord.update({
          where: {
            id: deliveryRecord.id
          },
          data: {
            status: "FAILED",
            errorMessage: "Payment attempt not found for provider event."
          }
        });

        return {
          ack: webhookAckSchema.parse({
            provider: PAYMENT_PROVIDER,
            eventId: event.eventId,
            duplicate: false,
            processed: false
          }),
          notificationPlans: []
        };
      }

      const paymentEvent = await tx.paymentEvent.create({
        data: {
          paymentAttemptId: paymentAttempt.id,
          externalEventId: event.eventId,
          type: event.type,
          payload: event.payload as Prisma.InputJsonValue,
          status: event.status
        }
      });

      await tx.paymentAttempt.update({
        where: {
          id: paymentAttempt.id
        },
        data: {
          status: event.status
        }
      });

      if (event.type === "payment_intent.succeeded") {
        notificationPlans = await this.settleSuccessfulPayment(
          tx,
          paymentAttempt.id
        );
      } else if (event.type === "payment_intent.payment_failed") {
        await this.markPaymentFailed(tx, paymentAttempt.id, event.payload);
      } else if (event.type === "payment_intent.requires_action") {
        await tx.checkoutSession.update({
          where: {
            id: paymentAttempt.checkoutSessionId
          },
          data: {
            status: "PAYMENT_PENDING"
          }
        });
      } else if (event.type === "charge.refunded") {
        await this.syncRefundStatus(tx, paymentAttempt.id);
      }

      await tx.paymentEvent.update({
        where: {
          id: paymentEvent.id
        },
        data: {
          processedAt: new Date()
        }
      });

      await tx.webhookDeliveryRecord.update({
        where: {
          id: deliveryRecord.id
        },
        data: {
          status: "PROCESSED",
          processedAt: new Date()
        }
      });

      return {
        ack: webhookAckSchema.parse({
          provider: PAYMENT_PROVIDER,
          eventId: event.eventId,
          duplicate: false,
          processed: true
        }),
        notificationPlans
      };
    });

    await this.dispatchNotificationPlans(result.notificationPlans ?? []);
    return result.ack;
  }

  private async settleSuccessfulPayment(
    tx: PrismaTransactionClient,
    paymentAttemptId: string
  ): Promise<NotificationPlan[]> {
    const paymentAttempt = await tx.paymentAttempt.findUnique({
      where: {
        id: paymentAttemptId
      },
      include: settlementInclude.include
    });

    if (!paymentAttempt) {
      throw new NotFoundException(
        `Payment attempt ${paymentAttemptId} was not found.`
      );
    }

    let order = paymentAttempt.checkoutSession.order;
    const pricingSnapshot =
      pricingSnapshotSchema
        .safeParse(paymentAttempt.checkoutSession.pricingSnapshot)
        .data ?? {
        subtotal: paymentAttempt.checkoutSession.cart.subtotal,
        discountTotal: paymentAttempt.checkoutSession.cart.discountTotal,
        total: paymentAttempt.checkoutSession.cart.total,
        currency: paymentAttempt.currency,
        couponCode: paymentAttempt.checkoutSession.cart.couponCode ?? null,
        discounts: []
      };

    if (!order) {
      const sellerIds = new Set(
        paymentAttempt.checkoutSession.cart.items.map(
          (item) => item.listing.sellerId
        )
      );

      order = await tx.order.create({
        data: {
          number: this.generateOrderNumber(),
          userId: paymentAttempt.checkoutSession.userId ?? undefined,
          sellerId:
            sellerIds.size === 1
              ? paymentAttempt.checkoutSession.cart.items[0]?.listing.sellerId
              : undefined,
          checkoutSessionId: paymentAttempt.checkoutSessionId,
          paymentAttemptId: paymentAttempt.id,
          status: "PAID",
          paymentStatus: "SUCCEEDED",
          currency: paymentAttempt.currency,
          subtotal: pricingSnapshot.subtotal,
          discountTotal: pricingSnapshot.discountTotal,
          total: pricingSnapshot.total,
          placedAt: new Date(),
          discountSnapshots: {
            create: pricingSnapshot.discounts.map((discount) => ({
              promotionId: discount.promotionId ?? undefined,
              couponCode: discount.couponCode ?? undefined,
              label: discount.label,
              amount: discount.amount.amount,
              currency: discount.amount.currency,
              metadata: {
                description: discount.description
              }
            }))
          },
          items: {
            create: paymentAttempt.checkoutSession.cart.items.map((item) => ({
              listingId: item.listingId,
              productId: item.listing.productId,
              variantId: item.listing.variantId ?? undefined,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.unitPrice * item.quantity,
              productTitleSnapshot: item.titleSnapshot,
              sellerNameSnapshot: item.sellerSnapshot
            }))
          },
          statusHistory: {
            create: [
              {
                actorUserId: paymentAttempt.checkoutSession.userId ?? undefined,
                status: "CREATED",
                note: "Order created from checkout settlement."
              },
              {
                actorUserId: paymentAttempt.checkoutSession.userId ?? undefined,
                status: "PAID",
                note: "Payment settled successfully."
              }
            ]
          }
        },
        include: {
          items: {
            select: {
              id: true,
              quantity: true
            }
          }
        }
      });
    } else {
      await tx.order.update({
        where: {
          id: order.id
        },
        data: {
          paymentStatus: "SUCCEEDED",
          status: "PAID",
          placedAt: order.placedAt ?? new Date(),
          paymentAttemptId: paymentAttempt.id,
          subtotal: pricingSnapshot.subtotal,
          discountTotal: pricingSnapshot.discountTotal,
          total: pricingSnapshot.total
        }
      });
    }

    for (const reservation of paymentAttempt.checkoutSession.reservations) {
      const updatedCount = await tx.stockReservation.updateMany({
        where: {
          id: reservation.id,
          status: "ACTIVE"
        },
        data: {
          status: "CONSUMED",
          orderId: order.id
        }
      });

      if (updatedCount.count === 0) {
        continue;
      }

      await tx.$executeRaw`
        UPDATE "InventoryItem"
        SET "onHand" = GREATEST("onHand" - ${reservation.quantity}, 0),
            "reserved" = GREATEST("reserved" - ${reservation.quantity}, 0)
        WHERE "id" = ${reservation.inventoryItemId}
      `;

      await tx.inventoryMovement.create({
        data: {
          inventoryItemId: reservation.inventoryItemId,
          reservationId: reservation.id,
          orderId: order.id,
          delta: -reservation.quantity,
          type: "CONSUMPTION",
          note: `Consumed by order ${order.number}.`
        }
      });
    }

    await tx.checkoutSession.update({
      where: {
        id: paymentAttempt.checkoutSessionId
      },
      data: {
        status: "COMPLETED"
      }
    });

    await tx.cart.update({
      where: {
        id: paymentAttempt.checkoutSession.cartId
      },
      data: {
        status: "CONVERTED"
      }
    });

    await tx.paymentAttempt.update({
      where: {
        id: paymentAttempt.id
      },
      data: {
        status: "SUCCEEDED"
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: paymentAttempt.checkoutSession.userId ?? undefined,
        entityType: "ORDER",
        entityId: order.id,
        action: "ORDER_PAID",
        details: {
          orderNumber: order.number,
          paymentAttemptId: paymentAttempt.id
        }
      }
    });

    const notificationPlans: NotificationPlan[] = [];

    if (paymentAttempt.checkoutSession.userId) {
      notificationPlans.push({
        userId: paymentAttempt.checkoutSession.userId,
        kind: "ORDER",
        level: "SUCCESS",
        title: "Order placed successfully",
        message: `Order ${order.number} has been paid and is now ready for fulfilment tracking.`,
        linkUrl: `/account/orders/${encodeURIComponent(order.number)}`
      });
    }

    const sellerOwners = new Map<string, number>();

    for (const item of paymentAttempt.checkoutSession.cart.items) {
      const ownerUserId = item.listing.seller.ownerUserId;

      if (!ownerUserId) {
        continue;
      }

      sellerOwners.set(
        ownerUserId,
        (sellerOwners.get(ownerUserId) ?? 0) + item.quantity
      );
    }

    for (const [userId, quantity] of sellerOwners.entries()) {
      notificationPlans.push({
        userId,
        kind: "ORDER",
        level: "SUCCESS",
        title: "New marketplace order",
        message: `Order ${order.number} includes ${quantity} item${quantity === 1 ? "" : "s"} from your catalog and is ready for operational review.`,
        linkUrl: `/seller/orders/${encodeURIComponent(order.number)}`
      });
    }

    return notificationPlans;
  }

  private async markPaymentFailed(
    tx: PrismaTransactionClient,
    paymentAttemptId: string,
    payload: Record<string, unknown>
  ) {
    const paymentAttempt = await tx.paymentAttempt.findUnique({
      where: {
        id: paymentAttemptId
      }
    });

    if (!paymentAttempt) {
      throw new NotFoundException(
        `Payment attempt ${paymentAttemptId} was not found.`
      );
    }

    await tx.paymentAttempt.update({
      where: {
        id: paymentAttempt.id
      },
      data: {
        status: "FAILED"
      }
    });

    await tx.checkoutSession.update({
      where: {
        id: paymentAttempt.checkoutSessionId
      },
      data: {
        status: "FAILED"
      }
    });

    await tx.auditLog.create({
      data: {
        entityType: "PAYMENT_ATTEMPT",
        entityId: paymentAttempt.id,
        action: "PAYMENT_FAILED",
        details: payload as Prisma.InputJsonValue
      }
    });
  }

  private async syncRefundStatus(
    tx: PrismaTransactionClient,
    paymentAttemptId: string
  ) {
    const paymentAttempt = await tx.paymentAttempt.findUnique({
      where: {
        id: paymentAttemptId
      },
      include: {
        refunds: true
      }
    });

    if (!paymentAttempt) {
      return;
    }

    const refundedAmount = paymentAttempt.refunds.reduce(
      (sum, refund) =>
        refund.status === "FAILED" ? sum : sum + refund.amount,
      0
    );
    const isFullRefund = refundedAmount >= paymentAttempt.amount;
    const nextStatus = isFullRefund ? "REFUNDED" : "PARTIALLY_REFUNDED";

    await tx.paymentAttempt.update({
      where: {
        id: paymentAttemptId
      },
      data: {
        status: nextStatus
      }
    });

    await tx.order.updateMany({
      where: {
        paymentAttemptId
      },
      data: {
        paymentStatus: nextStatus,
        ...(isFullRefund ? { status: "REFUNDED" } : {})
      }
    });
  }

  private buildRefundNotificationPlans(
    order: Prisma.OrderGetPayload<typeof orderDetailInclude>,
    amount: number
  ): NotificationPlan[] {
    const plans: NotificationPlan[] = [];
    const refundAmount = (amount / 100).toFixed(2);

    if (order.userId) {
      plans.push({
        userId: order.userId,
        kind: "REFUND",
        level: "INFO",
        title: "Refund recorded",
        message: `${refundAmount} ${order.currency} was recorded against order ${order.number}.`,
        linkUrl: `/account/orders/${encodeURIComponent(order.number)}`
      });
    }

    const sellerOwners = new Set(
      order.items
        .map((item) => item.listing.seller.ownerUserId)
        .filter((userId): userId is string => Boolean(userId))
    );

    for (const userId of sellerOwners) {
      plans.push({
        userId,
        kind: "REFUND",
        level: "INFO",
        title: "Refund issued on an order",
        message: `${refundAmount} ${order.currency} was issued on order ${order.number}. Review the order timeline for the updated payment posture.`,
        linkUrl: `/seller/orders/${encodeURIComponent(order.number)}`
      });
    }

    return plans;
  }

  private async dispatchNotificationPlans(plans: NotificationPlan[]) {
    for (const plan of plans) {
      await this.notificationsService.notifyUser(plan.userId, {
        kind: plan.kind,
        level: plan.level,
        title: plan.title,
        message: plan.message,
        linkUrl: plan.linkUrl
      });
    }
  }

  private async createProviderIntent(
    checkoutSessionId: string,
    amount: number,
    currency: string,
    idempotencyKey: string
  ): Promise<ProviderIntentResult> {
    if (!this.stripe) {
      const providerPaymentIntentId = `pi_local_${checkoutSessionId.replace(/[^a-zA-Z0-9]/g, "").slice(-16)}_${idempotencyKey.replace(/[^a-zA-Z0-9]/g, "").slice(-8)}`;
      return {
        providerPaymentIntentId,
        clientSecret: `local_secret_${providerPaymentIntentId}`
      };
    }

    const paymentIntent = await this.stripe.paymentIntents.create(
      {
        amount,
        currency: currency.toLowerCase(),
        metadata: {
          checkoutSessionId
        }
      },
      {
        idempotencyKey
      }
    );

    return {
      providerPaymentIntentId: paymentIntent.id,
      clientSecret: paymentIntent.client_secret
    };
  }

  private async confirmProviderIntent(
    paymentAttempt: {
      id: string;
      providerPaymentIntentId: string | null;
      checkoutSessionId: string;
      amount: number;
      currency: string;
    },
    scenario: "success" | "declined" | "requires_action"
  ): Promise<ConfirmIntentResult> {
    if (!paymentAttempt.providerPaymentIntentId) {
      throw new BadRequestException(
        "Payment attempt is missing a provider PaymentIntent id."
      );
    }

    if (!this.stripe) {
      const status =
        scenario === "success"
          ? "SUCCEEDED"
          : scenario === "declined"
            ? "FAILED"
            : "REQUIRES_ACTION";
      const type =
        scenario === "success"
          ? "payment_intent.succeeded"
          : scenario === "declined"
            ? "payment_intent.payment_failed"
            : "payment_intent.requires_action";

      return {
        providerPaymentIntentId: paymentAttempt.providerPaymentIntentId,
        clientSecret: `local_secret_${paymentAttempt.providerPaymentIntentId}`,
        event: {
          eventId: `evt_local_${paymentAttempt.providerPaymentIntentId}_${scenario}`,
          type,
          paymentIntentId: paymentAttempt.providerPaymentIntentId,
          status,
          payload: {
            id: paymentAttempt.providerPaymentIntentId,
            object: "payment_intent",
            amount: paymentAttempt.amount,
            currency: paymentAttempt.currency.toLowerCase(),
            metadata: {
              checkoutSessionId: paymentAttempt.checkoutSessionId
            },
            status:
              scenario === "success"
                ? "succeeded"
                : scenario === "declined"
                  ? "requires_payment_method"
                  : "requires_action"
          }
        }
      };
    }

    const paymentMethod =
      scenario === "success"
        ? "pm_card_visa"
        : scenario === "declined"
          ? "pm_card_chargeDeclined"
          : "pm_card_threeDSecure2Required";

    const intent = await this.stripe.paymentIntents.confirm(
      paymentAttempt.providerPaymentIntentId,
      {
        payment_method: paymentMethod,
        return_url: "https://velora.local/checkout/return"
      }
    );

    const type =
      intent.status === "succeeded"
        ? "payment_intent.succeeded"
        : intent.status === "requires_action"
          ? "payment_intent.requires_action"
          : "payment_intent.payment_failed";

    return {
      providerPaymentIntentId: intent.id,
      clientSecret: intent.client_secret,
      event: {
        eventId: `evt_confirm_${intent.id}_${intent.status}`,
        type,
        paymentIntentId: intent.id,
        status:
          intent.status === "succeeded"
            ? "SUCCEEDED"
            : intent.status === "requires_action"
              ? "REQUIRES_ACTION"
              : "FAILED",
        payload: intent as unknown as Record<string, unknown>
      }
    };
  }

  private parseStripeWebhook(
    rawBody: Buffer | string,
    signature: string | undefined
  ): NormalizedProviderEvent {
    if (this.stripe && this.isRealWebhookSecret()) {
      if (!signature) {
        throw new UnauthorizedException("Stripe signature header is missing.");
      }

      const event = this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.stripeWebhookSecret
      );
      const paymentIntent = event.data.object as Stripe.PaymentIntent;

      return {
        eventId: event.id,
        type: event.type,
        paymentIntentId: paymentIntent.id,
        status: this.mapPaymentStatus(event.type, paymentIntent.status),
        payload: event as unknown as Record<string, unknown>
      };
    }

    if (!signature) {
      throw new UnauthorizedException("Stripe signature header is missing.");
    }

    const payload = typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    if (!this.verifyLocalSignature(payload, signature)) {
      throw new UnauthorizedException("Stripe webhook signature verification failed.");
    }

    const parsed = JSON.parse(payload) as {
      id: string;
      type: string;
      data: {
        object: {
          id: string;
          status?: string;
        };
      };
    };

    return {
      eventId: parsed.id,
      type: parsed.type,
      paymentIntentId: parsed.data.object.id,
      status: this.mapPaymentStatus(parsed.type, parsed.data.object.status),
      payload: parsed as unknown as Record<string, unknown>
    };
  }

  private verifyLocalSignature(payload: string, signature: string) {
    const segments = new Map(
      signature.split(",").map((entry) => {
        const [key, value] = entry.split("=");
        return [key?.trim() ?? "", value?.trim() ?? ""];
      })
    );

    const timestamp = segments.get("t");
    const expected = segments.get("v1");

    if (!timestamp || !expected) {
      return false;
    }

    const digest = createHmac("sha256", this.stripeWebhookSecret)
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    return timingSafeEqual(Buffer.from(digest), Buffer.from(expected));
  }

  private mapPaymentStatus(type: string, paymentIntentStatus?: string | null): PaymentStatus {
    if (type === "payment_intent.succeeded") {
      return "SUCCEEDED";
    }

    if (type === "payment_intent.requires_action") {
      return "REQUIRES_ACTION";
    }

    if (type === "charge.refunded") {
      return "REFUNDED";
    }

    if (paymentIntentStatus === "requires_action") {
      return "REQUIRES_ACTION";
    }

    return "FAILED";
  }

  private async createProviderRefund(
    providerPaymentIntentId: string | null,
    amount: number
  ): Promise<{ externalRefundId: string; status: PaymentStatus }> {
    if (!providerPaymentIntentId) {
      throw new BadRequestException(
        "The payment attempt has no provider payment intent id."
      );
    }

    if (!this.stripe) {
      return {
        externalRefundId: `re_local_${providerPaymentIntentId}_${amount}`,
        status: "SUCCEEDED"
      };
    }

    const refund = await this.stripe.refunds.create({
      payment_intent: providerPaymentIntentId,
      amount
    });

    return {
      externalRefundId: refund.id,
      status: refund.status === "succeeded" ? "SUCCEEDED" : "PENDING"
    };
  }

  private generateOrderNumber() {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    return `VLR-${datePart}-${randomUUID().slice(0, 8).toUpperCase()}`;
  }

  private isStripeConfigured() {
    return (
      this.stripeSecretKey.startsWith("sk_test_") &&
      this.stripeSecretKey !== "sk_test_placeholder"
    );
  }

  private isRealWebhookSecret() {
    return (
      this.stripeWebhookSecret.startsWith("whsec_") &&
      this.stripeWebhookSecret !== "whsec_placeholder"
    );
  }
}
