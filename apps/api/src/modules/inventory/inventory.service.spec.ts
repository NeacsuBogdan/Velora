import { ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { InventoryService } from "./inventory.service";

describe("InventoryService", () => {
  const prisma = {};

  let inventoryService: InventoryService;

  beforeEach(() => {
    vi.clearAllMocks();
    inventoryService = new InventoryService(prisma as never);
  });

  it("releases expired reservations and reports the affected inventory rows", async () => {
    const reservations = new Map([
      [
        "reservation-1",
        {
          id: "reservation-1",
          inventoryItemId: "inventory-1",
          checkoutSessionId: "checkout-1",
          quantity: 2,
          status: "ACTIVE"
        }
      ],
      [
        "reservation-2",
        {
          id: "reservation-2",
          inventoryItemId: "inventory-2",
          checkoutSessionId: "checkout-2",
          quantity: 1,
          status: "ACTIVE"
        }
      ]
    ]);

    const tx = {
      stockReservation: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "reservation-1",
            inventoryItemId: "inventory-1",
            checkoutSessionId: "checkout-1",
            quantity: 2
          },
          {
            id: "reservation-2",
            inventoryItemId: "inventory-2",
            checkoutSessionId: "checkout-2",
            quantity: 1
          }
        ]),
        findUnique: vi.fn(({ where }: { where: { id: string } }) =>
          Promise.resolve(reservations.get(where.id) ?? null)
        ),
        update: vi.fn()
      },
      $executeRaw: vi.fn().mockResolvedValue(1),
      inventoryMovement: {
        create: vi.fn()
      },
      auditLog: {
        create: vi.fn()
      }
    };

    const result =
      await inventoryService.releaseExpiredReservationsWithinTransaction(
        tx as never,
        new Date("2026-03-12T10:00:00.000Z"),
        "user-1"
      );

    expect(result).toEqual({
      releasedReservations: 2,
      inventoryItemsAdjusted: 2
    });
    expect(tx.stockReservation.update).toHaveBeenCalledTimes(2);
    expect(tx.inventoryMovement.create).toHaveBeenCalledTimes(2);
  });

  it("allows only one concurrent reservation to take the last available unit", async () => {
    let reserved = 0;

    const tx = {
      inventoryItem: {
        findUnique: vi.fn().mockImplementation(() =>
          Promise.resolve({
            id: "inventory-1",
            listingId: "listing-1",
            onHand: 1,
            reserved,
            safetyStock: 0
          })
        )
      },
      $queryRaw: vi.fn().mockImplementation(
        (_strings: TemplateStringsArray, quantity: number) => {
          if (1 - reserved >= quantity) {
            reserved += quantity;
            return Promise.resolve([{ id: "inventory-1" }]);
          }

          return Promise.resolve([]);
        }
      ),
      stockReservation: {
        create: vi.fn().mockImplementation(({ data }: { data: { quantity: number } }) =>
          Promise.resolve({
            id: `reservation-${reserved}`,
            ...data
          })
        )
      },
      inventoryMovement: {
        create: vi.fn().mockResolvedValue(undefined)
      },
      auditLog: {
        create: vi.fn().mockResolvedValue(undefined)
      }
    };

    const attempts = await Promise.allSettled([
      inventoryService.reserveInventoryForCheckoutWithinTransaction(tx as never, {
        actorUserId: "user-1",
        cartId: "cart-1",
        checkoutSessionId: "checkout-1",
        inventoryItemId: "inventory-1",
        quantity: 1,
        expiresAt: new Date("2026-03-12T10:15:00.000Z")
      }),
      inventoryService.reserveInventoryForCheckoutWithinTransaction(tx as never, {
        actorUserId: "user-2",
        cartId: "cart-2",
        checkoutSessionId: "checkout-2",
        inventoryItemId: "inventory-1",
        quantity: 1,
        expiresAt: new Date("2026-03-12T10:15:00.000Z")
      })
    ]);

    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(attempts.filter((attempt) => attempt.status === "rejected")).toHaveLength(1);
    expect(
      attempts.find((attempt) => attempt.status === "rejected")
    ).toMatchObject({
      reason: expect.any(ConflictException)
    });
  });
});
