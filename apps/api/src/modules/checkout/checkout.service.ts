import {
  BadRequestException,
  Injectable
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  checkoutSessionResponseSchema,
  createCheckoutSessionRequestSchema,
  domainOverviewSchema,
  type AuthenticatedUser
} from "@velora/contracts";

import { CartService } from "../cart/cart.service";
import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";

const RESERVATION_TTL_MINUTES = 15;

@Injectable()
export class CheckoutService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly inventoryService: InventoryService
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

  async createCheckoutSession(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = createCheckoutSessionRequestSchema.parse(rawInput);
    const now = new Date();
    const reservationExpiresAt = new Date(
      now.getTime() + RESERVATION_TTL_MINUTES * 60 * 1000
    );
    const idempotencyKey = input.idempotencyKey ?? randomUUID();

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        now,
        viewer.id
      );

      const existingSession = await tx.checkoutSession.findFirst({
        where: {
          idempotencyKey,
          userId: viewer.id
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

      const cart = await this.cartService.prepareCartForCheckout(tx, viewer.id);

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
          viewer.id,
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
          userId: viewer.id,
          status: "STARTED",
          amount: cart.total,
          currency: cart.currency,
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
            actorUserId: viewer.id,
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
          actorUserId: viewer.id,
          entityType: "CHECKOUT_SESSION",
          entityId: checkoutSession.id,
          action: "CHECKOUT_SESSION_CREATED",
          details: {
            cartId: cart.id,
            itemCount: cart.items.length,
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
}
