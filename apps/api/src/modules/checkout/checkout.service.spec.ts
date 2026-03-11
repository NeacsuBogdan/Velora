import { beforeEach, describe, expect, it, vi } from "vitest";

import { CheckoutService } from "./checkout.service";

describe("CheckoutService", () => {
  const tx = {
    checkoutSession: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      updateMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    )
  };

  const cartService = {
    prepareCartForCheckout: vi.fn()
  };

  const inventoryService = {
    releaseExpiredReservationsWithinTransaction: vi.fn(),
    releaseReservationsForCheckoutSessionWithinTransaction: vi.fn(),
    reserveInventoryForCheckoutWithinTransaction: vi.fn()
  };

  let checkoutService: CheckoutService;

  beforeEach(() => {
    vi.clearAllMocks();
    checkoutService = new CheckoutService(
      prisma as never,
      cartService as never,
      inventoryService as never
    );
    inventoryService.releaseExpiredReservationsWithinTransaction.mockResolvedValue(
      {
        releasedReservations: 0,
        inventoryItemsAdjusted: 0
      }
    );
    inventoryService.releaseReservationsForCheckoutSessionWithinTransaction.mockResolvedValue(
      {
        releasedReservations: 0,
        inventoryItemsAdjusted: 0
      }
    );
    inventoryService.reserveInventoryForCheckoutWithinTransaction.mockResolvedValue({
      id: "reservation-1"
    });
  });

  it("creates a checkout session and reserves stock for each cart line", async () => {
    tx.checkoutSession.findFirst.mockResolvedValue(null);
    tx.checkoutSession.findMany.mockResolvedValue([]);
    tx.checkoutSession.create.mockResolvedValue({
      id: "checkout-1",
      cartId: "cart-1",
      status: "STARTED",
      amount: 329900,
      currency: "RON"
    });
    cartService.prepareCartForCheckout.mockResolvedValue({
      cart: {
        id: "cart-1",
        currency: "RON",
        total: 329900,
        items: [
          {
            listingId: "listing-1",
            quantity: 1,
            listing: {
              inventoryItem: {
                id: "inventory-1"
              }
            }
          }
        ]
      },
      pricing: {
        subtotal: 329900,
        discountTotal: 0,
        total: 329900,
        currency: "RON",
        couponCode: null,
        discounts: []
      }
    });

    const result = await checkoutService.createCheckoutSession(
      {
        id: "user-1",
        email: "customer@velora.local",
        firstName: "Demo",
        lastName: "Customer",
        roles: [
          {
            code: "CUSTOMER",
            name: "Customer"
          }
        ]
      },
      {}
    );

    expect(cartService.prepareCartForCheckout).toHaveBeenCalled();
    expect(
      inventoryService.reserveInventoryForCheckoutWithinTransaction
    ).toHaveBeenCalledTimes(1);
    expect(result.checkoutSessionId).toBe("checkout-1");
    expect(result.amount.amount).toBe(329900);
  });

  it("returns the existing checkout session when the idempotency key has already been used", async () => {
    tx.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout-1",
      cartId: "cart-1",
      status: "STARTED",
      amount: 329900,
      currency: "RON",
      reservationExpiresAt: new Date("2026-03-12T10:15:00.000Z"),
      reservations: [{ quantity: 1 }]
    });

    const result = await checkoutService.createCheckoutSession(
      {
        id: "user-1",
        email: "customer@velora.local",
        firstName: "Demo",
        lastName: "Customer",
        roles: [
          {
            code: "CUSTOMER",
            name: "Customer"
          }
        ]
      },
      {
        idempotencyKey: "checkout-session-key"
      }
    );

    expect(cartService.prepareCartForCheckout).not.toHaveBeenCalled();
    expect(
      inventoryService.reserveInventoryForCheckoutWithinTransaction
    ).not.toHaveBeenCalled();
    expect(result.checkoutSessionId).toBe("checkout-1");
  });
});
