import {
  BadRequestException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Prisma } from "@prisma/client";
import {
  checkoutSessionDetailSchema,
  checkoutSessionResponseSchema,
  createCheckoutSessionRequestSchema,
  domainOverviewSchema,
  paymentAttemptSummarySchema,
  type AuthenticatedUser
} from "@velora/contracts";

import {
  hashGuestCartToken,
  type CommerceContext
} from "../../common/commerce-context";
import { CartService } from "../cart/cart.service";
import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import {
  parseCheckoutAddressSnapshot,
  parseCheckoutContactSnapshot,
  serializeCheckoutAddress,
  serializeCheckoutContact
} from "./checkout.helpers";
import {
  mapOrderSummary,
  orderSummaryInclude
} from "../orders/order.helpers";
import { OrdersService } from "../orders/orders.service";
import { pricingSnapshotSchema } from "../promotions/pricing.helpers";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";

const RESERVATION_TTL_MINUTES = 15;

const checkoutDetailInclude =
  Prisma.validator<Prisma.CheckoutSessionDefaultArgs>()({
    include: {
      reservations: {
        where: {
          status: "ACTIVE"
        },
        include: {
          inventoryItem: {
            include: {
              listing: {
                include: searchProjectionListingInclude.include
              }
            }
          }
        },
        orderBy: {
          createdAt: "asc"
        }
      },
      paymentAttempts: {
        orderBy: {
          createdAt: "desc"
        }
      },
      order: {
        include: orderSummaryInclude.include
      }
    }
  });

type CheckoutDetailRecord = Prisma.CheckoutSessionGetPayload<
  typeof checkoutDetailInclude
>;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService,
    private readonly ordersService: OrdersService
  ) {}

  async getOverview(viewer: AuthenticatedUser) {
    const isAdmin = viewer.roles.some((role) => role.code === "ADMIN");
    const checkoutWhere = isAdmin ? undefined : { userId: viewer.id };

    const [sessionCount, pendingCount, reservedCount] = await Promise.all([
      this.prisma.checkoutSession.count({ where: checkoutWhere }),
      this.prisma.checkoutSession.count({
        where: {
          ...(checkoutWhere ?? {}),
          status: "PAYMENT_PENDING"
        }
      }),
      this.prisma.stockReservation.count({
        where: isAdmin
          ? { checkoutSessionId: { not: null } }
          : { checkoutSession: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "checkout",
      metrics: {
        sessions: sessionCount,
        paymentPending: pendingCount,
        reservedUnits: reservedCount
      },
      notes: [
        isAdmin
          ? "Admin overview across checkout sessions."
          : "Customer-scoped checkout state."
      ]
    });
  }

  async getCheckoutSessionDetail(
    context: CommerceContext,
    checkoutSessionId: string
  ) {
    const checkoutSession = await this.prisma.checkoutSession.findFirst({
      where: this.buildCheckoutOwnershipWhere(context, checkoutSessionId),
      include: checkoutDetailInclude.include
    });

    if (!checkoutSession) {
      throw new NotFoundException(
        `Checkout session ${checkoutSessionId} was not found.`
      );
    }

    return this.mapCheckoutSessionDetail(checkoutSession);
  }

  async createCheckoutSession(context: CommerceContext, rawInput: unknown) {
    const input = createCheckoutSessionRequestSchema.parse(rawInput);
    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000
    );
    const idempotencyKey = input.idempotencyKey ?? randomUUID();
    const customerSnapshot = serializeCheckoutContact(input.customer);
    const deliveryAddressSnapshot = serializeCheckoutAddress(
      input.deliveryAddress
    );

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        now,
        context.user?.id ?? null
      );

      const { cart, pricing } = await this.cartService.prepareCartForCheckout(
        tx,
        context
      );

      const existingSession = await tx.checkoutSession.findFirst({
        where: {
          idempotencyKey,
          cartId: cart.id
        },
        include: {
          reservations: {
            where: {
              status: "ACTIVE"
            },
            select: {
              quantity: true
            }
          }
        }
      });

      if (existingSession && existingSession.reservationExpiresAt) {
        return checkoutSessionResponseSchema.parse({
          checkoutSessionId: existingSession.id,
          cartId: existingSession.cartId,
          status: existingSession.status,
          amount: {
            amount: existingSession.amount,
            currency: existingSession.currency
          },
          reservationExpiresAt:
            existingSession.reservationExpiresAt.toISOString(),
          reservationCount: existingSession.reservations.length
        });
      }

      if (cart.items.length === 0) {
        throw new BadRequestException("The cart is empty.");
      }

      const existingCartSessions = await tx.checkoutSession.findMany({
        where: {
          cartId: cart.id,
          status: {
            in: ["STARTED", "PAYMENT_PENDING"]
          }
        },
        select: {
          id: true
        }
      });

      for (const session of existingCartSessions) {
        await this.inventoryService.releaseReservationsForCheckoutSessionWithinTransaction(
          tx,
          session.id,
          context.user?.id ?? null,
          "Superseded by a newer checkout session."
        );

        await tx.checkoutSession.updateMany({
          where: {
            id: session.id
          },
          data: {
            status: "EXPIRED",
            reservationExpiresAt: now
          }
        });
      }

      const checkoutSession = await tx.checkoutSession.create({
        data: {
          cartId: cart.id,
          userId: context.user?.id,
          status: "STARTED",
          amount: pricing.total,
          currency: pricing.currency,
          pricingSnapshot: pricing as Prisma.InputJsonValue,
          customerSnapshot: customerSnapshot as Prisma.InputJsonValue,
          deliveryAddressSnapshot:
            deliveryAddressSnapshot as Prisma.InputJsonValue,
          idempotencyKey,
          reservationExpiresAt
        }
      });

      for (const item of cart.items) {
        if (!item.listing.inventoryItem) {
          throw new BadRequestException(
            `Listing ${item.listingId} is missing inventory coverage.`
          );
        }

        await this.inventoryService.reserveInventoryForCheckoutWithinTransaction(
          tx,
          {
            actorUserId: context.user?.id ?? null,
            cartId: cart.id,
            checkoutSessionId: checkoutSession.id,
            inventoryItemId: item.listing.inventoryItem.id,
            quantity: item.quantity,
            expiresAt: reservationExpiresAt
          }
        );
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user?.id ?? undefined,
          entityType: "CHECKOUT_SESSION",
          entityId: checkoutSession.id,
          action: "CHECKOUT_SESSION_CREATED",
          details: {
            cartId: cart.id,
            itemCount: cart.items.length,
            checkoutMode: context.user ? "authenticated" : "guest",
            reservationExpiresAt: reservationExpiresAt.toISOString()
          }
        }
      });

      return checkoutSessionResponseSchema.parse({
        checkoutSessionId: checkoutSession.id,
        cartId: checkoutSession.cartId,
        status: checkoutSession.status,
        amount: {
          amount: checkoutSession.amount,
          currency: checkoutSession.currency
        },
        reservationExpiresAt: reservationExpiresAt.toISOString(),
        reservationCount: cart.items.length
      });
    });
  }

  async getCheckoutSessionDetailById(checkoutSessionId: string) {
    const checkoutSession = await this.prisma.checkoutSession.findUnique({
      where: {
        id: checkoutSessionId
      },
      include: checkoutDetailInclude.include
    });

    if (!checkoutSession) {
      throw new NotFoundException(
        `Checkout session ${checkoutSessionId} was not found.`
      );
    }

    return this.mapCheckoutSessionDetail(checkoutSession);
  }

  async getCheckoutConfirmationDetail(
    context: CommerceContext,
    number: string
  ) {
    return this.ordersService.getCheckoutConfirmationDetail(context, number);
  }

  private mapCheckoutSessionDetail(checkoutSession: CheckoutDetailRecord) {
    const pricingSnapshot =
      pricingSnapshotSchema.safeParse(checkoutSession.pricingSnapshot).data ??
      null;

    return checkoutSessionDetailSchema.parse({
      checkoutSessionId: checkoutSession.id,
      cartId: checkoutSession.cartId,
      checkoutMode: checkoutSession.userId ? "authenticated" : "guest",
      status: checkoutSession.status,
      amount: {
        amount: checkoutSession.amount,
        currency: checkoutSession.currency
      },
      customer: parseCheckoutContactSnapshot(checkoutSession.customerSnapshot),
      deliveryAddress: parseCheckoutAddressSnapshot(
        checkoutSession.deliveryAddressSnapshot
      ),
      reservationExpiresAt:
        checkoutSession.reservationExpiresAt?.toISOString() ?? null,
      reservations: checkoutSession.reservations.map((reservation) => {
        const projection = buildSearchDocument(reservation.inventoryItem.listing);

        return {
          reservationId: reservation.id,
          listingId: projection.listingId,
          productId: projection.productId,
          slug: projection.slug,
          title: projection.title,
          subtitle: projection.subtitle,
          seller: projection.seller,
          quantity: reservation.quantity,
          expiresAt: reservation.expiresAt.toISOString()
        };
      }),
      discounts: pricingSnapshot?.discounts ?? [],
      paymentAttempts: checkoutSession.paymentAttempts.map((attempt) =>
        paymentAttemptSummarySchema.parse({
          attemptId: attempt.id,
          checkoutSessionId: attempt.checkoutSessionId,
          provider: attempt.provider,
          providerPaymentIntentId: attempt.providerPaymentIntentId ?? null,
          clientSecret: null,
          status: attempt.status,
          amount: {
            amount: attempt.amount,
            currency: attempt.currency
          },
          createdAt: attempt.createdAt.toISOString(),
          updatedAt: attempt.updatedAt.toISOString()
        })
      ),
      order: checkoutSession.order ? mapOrderSummary(checkoutSession.order) : null
    });
  }

  private buildCheckoutOwnershipWhere(
    context: CommerceContext,
    checkoutSessionId: string
  ) {
    if (context.user) {
      return {
        id: checkoutSessionId,
        userId: context.user.id
      };
    }

    if (context.guestCartToken) {
      return {
        id: checkoutSessionId,
        cart: {
          guestTokenHash: hashGuestCartToken(context.guestCartToken),
          userId: null
        }
      };
    }

    return {
      id: "__missing_checkout_scope__"
    };
  }
}
