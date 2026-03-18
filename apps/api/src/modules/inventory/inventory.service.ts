import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type InventoryReservationStatus } from "@prisma/client";
import {
  domainOverviewSchema,
  releaseReservationsResponseSchema,
  type AuthenticatedUser,
  type ReleaseReservationsResponse
} from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";

type PrismaTransactionClient = Prisma.TransactionClient;

interface ReleaseReservationParams {
  actorUserId?: string | null;
  checkoutSessionId?: string | null;
  note: string;
  now?: Date;
  reason: "RESERVATION_RELEASED" | "RESERVATION_EXPIRED";
  status: InventoryReservationStatus;
}

interface ReserveInventoryParams {
  actorUserId?: string | null;
  cartId: string;
  checkoutSessionId: string;
  inventoryItemId: string;
  quantity: number;
  expiresAt: Date;
}

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(viewer: AuthenticatedUser) {
    const sellerScope = viewer.roles.some((role) => role.code === "SELLER")
      ? await this.prisma.seller.findUnique({
          where: { ownerUserId: viewer.id }
        })
      : null;

    const [itemCount, reservationCount, movementCount] = await Promise.all([
      this.prisma.inventoryItem.count({
        where: sellerScope
          ? { listing: { sellerId: sellerScope.id } }
          : undefined
      }),
      this.prisma.stockReservation.count({
        where: sellerScope
          ? { inventoryItem: { listing: { sellerId: sellerScope.id } } }
          : undefined
      }),
      this.prisma.inventoryMovement.count({
        where: sellerScope
          ? { inventoryItem: { listing: { sellerId: sellerScope.id } } }
          : undefined
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "inventory",
      metrics: {
        items: itemCount,
        reservations: reservationCount,
        movements: movementCount
      },
      notes: [
        sellerScope
          ? `Scoped to seller ${sellerScope.displayName}.`
          : "Admin scope across the full inventory footprint."
      ]
    });
  }

  async releaseExpiredReservations(
    actorUserId?: string | null
  ): Promise<ReleaseReservationsResponse> {
    return this.prisma.$transaction((tx) =>
      this.releaseExpiredReservationsWithinTransaction(
        tx,
        new Date(),
        actorUserId ?? null
      )
    );
  }

  async releaseExpiredReservationsWithinTransaction(
    tx: PrismaTransactionClient,
    now: Date,
    actorUserId?: string | null
  ): Promise<ReleaseReservationsResponse> {
    const reservations = await tx.stockReservation.findMany({
      where: {
        status: "ACTIVE",
        expiresAt: {
          lte: now
        }
      },
      select: {
        id: true,
        inventoryItemId: true,
        checkoutSessionId: true,
        quantity: true
      }
    });

    let releasedReservations = 0;
    const inventoryItemsAdjusted = new Set<string>();

    for (const reservation of reservations) {
      const released = await this.releaseReservationRecord(tx, reservation.id, {
        actorUserId,
        checkoutSessionId: reservation.checkoutSessionId,
        note: "Reservation expired before checkout completion.",
        now,
        reason: "RESERVATION_EXPIRED",
        status: "EXPIRED"
      });

      if (!released) {
        continue;
      }

      releasedReservations += 1;
      inventoryItemsAdjusted.add(reservation.inventoryItemId);
    }

    return releaseReservationsResponseSchema.parse({
      releasedReservations,
      inventoryItemsAdjusted: inventoryItemsAdjusted.size
    });
  }

  async releaseReservationsForCheckoutSession(
    checkoutSessionId: string,
    actorUserId: string | null | undefined,
    note: string
  ): Promise<ReleaseReservationsResponse> {
    return this.prisma.$transaction((tx) =>
      this.releaseReservationsForCheckoutSessionWithinTransaction(
        tx,
        checkoutSessionId,
        actorUserId ?? null,
        note
      )
    );
  }

  async releaseReservationsForCheckoutSessionWithinTransaction(
    tx: PrismaTransactionClient,
    checkoutSessionId: string,
    actorUserId: string | null | undefined,
    note: string
  ): Promise<ReleaseReservationsResponse> {
    const reservations = await tx.stockReservation.findMany({
      where: {
        checkoutSessionId,
        status: "ACTIVE"
      },
      select: {
        id: true,
        inventoryItemId: true
      }
    });

    let releasedReservations = 0;
    const inventoryItemsAdjusted = new Set<string>();

    for (const reservation of reservations) {
      const released = await this.releaseReservationRecord(tx, reservation.id, {
        actorUserId,
        checkoutSessionId,
        note,
        reason: "RESERVATION_RELEASED",
        status: "RELEASED"
      });

      if (!released) {
        continue;
      }

      releasedReservations += 1;
      inventoryItemsAdjusted.add(reservation.inventoryItemId);
    }

    return releaseReservationsResponseSchema.parse({
      releasedReservations,
      inventoryItemsAdjusted: inventoryItemsAdjusted.size
    });
  }

  async reserveInventoryForCheckoutWithinTransaction(
    tx: PrismaTransactionClient,
    params: ReserveInventoryParams
  ) {
    const inventoryItem = await tx.inventoryItem.findUnique({
      where: { id: params.inventoryItemId },
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
        `Inventory item ${params.inventoryItemId} was not found.`
      );
    }

    const reservationResult = await tx.$queryRaw<Array<{ id: string }>>`
      UPDATE "InventoryItem"
      SET "reserved" = "reserved" + ${params.quantity}
      WHERE "id" = ${params.inventoryItemId}
        AND ("onHand" - "reserved" - "safetyStock") >= ${params.quantity}
      RETURNING "id"
    `;

    if (reservationResult.length === 0) {
      throw new ConflictException(
        "The requested quantity is no longer available."
      );
    }

    const reservation = await tx.stockReservation.create({
      data: {
        inventoryItemId: params.inventoryItemId,
        cartId: params.cartId,
        checkoutSessionId: params.checkoutSessionId,
        quantity: params.quantity,
        expiresAt: params.expiresAt,
        status: "ACTIVE"
      }
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: params.inventoryItemId,
        reservationId: reservation.id,
        delta: -params.quantity,
        type: "RESERVATION",
        note: `Reserved for checkout session ${params.checkoutSessionId}.`
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? undefined,
        entityType: "STOCK_RESERVATION",
        entityId: reservation.id,
        action: "RESERVATION_CREATED",
        details: {
          checkoutSessionId: params.checkoutSessionId,
          cartId: params.cartId,
          inventoryItemId: params.inventoryItemId,
          quantity: params.quantity,
          expiresAt: params.expiresAt.toISOString()
        }
      }
    });

    return reservation;
  }

  private async releaseReservationRecord(
    tx: PrismaTransactionClient,
    reservationId: string,
    params: ReleaseReservationParams
  ) {
    const now = params.now ?? new Date();
    const reservation = await tx.stockReservation.findUnique({
      where: { id: reservationId },
      select: {
        id: true,
        inventoryItemId: true,
        checkoutSessionId: true,
        quantity: true,
        status: true
      }
    });

    if (!reservation || reservation.status !== "ACTIVE") {
      return false;
    }

    await tx.stockReservation.update({
      where: { id: reservationId },
      data: {
        status: params.status,
        expiresAt:
          params.status === "EXPIRED" ? now : reservation.quantity > 0 ? now : undefined
      }
    });

    await tx.$executeRaw`
      UPDATE "InventoryItem"
      SET "reserved" = GREATEST("reserved" - ${reservation.quantity}, 0)
      WHERE "id" = ${reservation.inventoryItemId}
    `;

    await tx.inventoryMovement.create({
      data: {
        inventoryItemId: reservation.inventoryItemId,
        reservationId,
        delta: reservation.quantity,
        type: "RELEASE",
        note: params.note
      }
    });

    await tx.auditLog.create({
      data: {
        actorUserId: params.actorUserId ?? undefined,
        entityType: "STOCK_RESERVATION",
        entityId: reservationId,
        action: params.reason,
        details: {
          checkoutSessionId:
            params.checkoutSessionId ?? reservation.checkoutSessionId ?? null,
          quantity: reservation.quantity,
          status: params.status,
          note: params.note
        }
      }
    });

    return true;
  }
}
