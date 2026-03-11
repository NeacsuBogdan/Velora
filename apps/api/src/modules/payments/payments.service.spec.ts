import { createHmac } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AuthenticatedUser } from "@velora/contracts";

import { PaymentsService } from "./payments.service";

const viewer: AuthenticatedUser = {
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
};

function createCheckoutDetail(overrides: Record<string, unknown> = {}) {
  return {
    checkoutSessionId: "checkout-1",
    cartId: "cart-1",
    status: "COMPLETED",
    amount: {
      amount: 329900,
      currency: "RON"
    },
    reservationExpiresAt: "2026-03-12T10:15:00.000Z",
    reservations: [],
    paymentAttempts: [],
    order: {
      orderId: "order-1",
      number: "VLR-20260312-ABCD1234",
      status: "PAID",
      paymentStatus: "SUCCEEDED",
      total: {
        amount: 329900,
        currency: "RON"
      },
      subtotal: {
        amount: 329900,
        currency: "RON"
      },
      discountTotal: {
        amount: 0,
        currency: "RON"
      },
      itemCount: 1,
      createdAt: "2026-03-12T10:01:00.000Z",
      placedAt: "2026-03-12T10:01:00.000Z"
    },
    ...overrides
  };
}

describe("PaymentsService", () => {
  const tx = {
    checkoutSession: {
      findFirst: vi.fn(),
      update: vi.fn()
    },
    paymentAttempt: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    webhookDeliveryRecord: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    paymentEvent: {
      create: vi.fn(),
      update: vi.fn()
    },
    refundRecord: {
      create: vi.fn()
    },
    order: {
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    orderStatusHistory: {
      create: vi.fn()
    },
    stockReservation: {
      updateMany: vi.fn()
    },
    inventoryMovement: {
      create: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    },
    cart: {
      update: vi.fn()
    },
    $executeRaw: vi.fn()
  };

  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
    paymentAttempt: {
      count: vi.fn(),
      findUnique: vi.fn()
    },
    paymentEvent: {
      count: vi.fn()
    },
    refundRecord: {
      count: vi.fn()
    },
    webhookDeliveryRecord: {
      count: vi.fn()
    }
  };

  const checkoutService = {
    getCheckoutSessionDetailById: vi.fn()
  };

  const inventoryService = {
    releaseReservationsForCheckoutSessionWithinTransaction: vi.fn()
  };

  const auditService = {
    record: vi.fn()
  };

  let paymentsService: PaymentsService;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.STRIPE_SECRET_KEY = "sk_test_placeholder";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_stage5";

    paymentsService = new PaymentsService(
      prisma as never,
      checkoutService as never,
      inventoryService as never,
      auditService as never
    );

    tx.checkoutSession.update.mockResolvedValue(undefined);
    tx.paymentAttempt.create.mockResolvedValue(undefined);
    tx.paymentAttempt.update.mockResolvedValue(undefined);
    tx.paymentEvent.create.mockResolvedValue({ id: "payment-event-1" });
    tx.paymentEvent.update.mockResolvedValue(undefined);
    tx.webhookDeliveryRecord.create.mockResolvedValue({ id: "delivery-1" });
    tx.webhookDeliveryRecord.update.mockResolvedValue(undefined);
    tx.order.create.mockResolvedValue({
      id: "order-1",
      number: "VLR-20260312-ABCD1234",
      items: [{ id: "order-item-1", quantity: 1 }]
    });
    tx.order.update.mockResolvedValue(undefined);
    tx.order.updateMany.mockResolvedValue(undefined);
    tx.orderStatusHistory.create.mockResolvedValue(undefined);
    tx.stockReservation.updateMany.mockResolvedValue({ count: 1 });
    tx.inventoryMovement.create.mockResolvedValue(undefined);
    tx.auditLog.create.mockResolvedValue(undefined);
    tx.cart.update.mockResolvedValue(undefined);
    tx.$executeRaw.mockResolvedValue(1);
    checkoutService.getCheckoutSessionDetailById.mockResolvedValue(
      createCheckoutDetail({
        paymentAttempts: [
          {
            attemptId: "attempt-1",
            checkoutSessionId: "checkout-1",
            provider: "stripe",
            providerPaymentIntentId: "pi_local_checkout1",
            clientSecret: null,
            status: "SUCCEEDED",
            amount: {
              amount: 329900,
              currency: "RON"
            },
            createdAt: "2026-03-12T10:00:00.000Z",
            updatedAt: "2026-03-12T10:01:00.000Z"
          }
        ]
      })
    );
  });

  it("returns an existing payment attempt for the same checkout idempotency key", async () => {
    tx.checkoutSession.findFirst.mockResolvedValue({
      id: "checkout-1",
      userId: "user-1",
      amount: 329900,
      currency: "RON",
      reservationExpiresAt: new Date("2026-03-12T10:15:00.000Z"),
      order: null,
      reservations: [{ id: "reservation-1", quantity: 1 }]
    });
    tx.paymentAttempt.findFirst.mockResolvedValue({
      id: "attempt-1",
      checkoutSessionId: "checkout-1",
      provider: "stripe",
      providerPaymentIntentId: "pi_local_checkout1",
      status: "PENDING",
      amount: 329900,
      currency: "RON",
      createdAt: new Date("2026-03-12T10:00:00.000Z"),
      updatedAt: new Date("2026-03-12T10:00:00.000Z")
    });

    const result = await paymentsService.createPaymentAttempt(
      viewer,
      "checkout-1",
      {
        idempotencyKey: "payment-key-1"
      }
    );

    expect(tx.paymentAttempt.create).not.toHaveBeenCalled();
    expect(result.attemptId).toBe("attempt-1");
    expect(result.status).toBe("PENDING");
  });

  it("settles a successful payment attempt into an order", async () => {
    prisma.paymentAttempt.findUnique
      .mockResolvedValueOnce({
        id: "attempt-1",
        checkoutSessionId: "checkout-1",
        providerPaymentIntentId: "pi_local_checkout1",
        amount: 329900,
        currency: "RON",
        status: "PENDING",
        checkoutSession: {
          id: "checkout-1",
          userId: "user-1"
        }
      })
      .mockResolvedValueOnce({
        id: "attempt-1",
        checkoutSessionId: "checkout-1",
        provider: "stripe",
        providerPaymentIntentId: "pi_local_checkout1",
        amount: 329900,
        currency: "RON",
        status: "SUCCEEDED",
        createdAt: new Date("2026-03-12T10:00:00.000Z"),
        updatedAt: new Date("2026-03-12T10:01:00.000Z")
      });

    tx.webhookDeliveryRecord.findUnique.mockResolvedValue(null);
    tx.paymentAttempt.findUnique.mockImplementation(
      ({ where, include }: { where: { id?: string; providerPaymentIntentId?: string }; include?: unknown }) => {
        if (where.providerPaymentIntentId) {
          return Promise.resolve({
            id: "attempt-1",
            checkoutSessionId: "checkout-1"
          });
        }

        if (where.id === "attempt-1" && include) {
          return Promise.resolve({
            id: "attempt-1",
            checkoutSessionId: "checkout-1",
            currency: "RON",
            checkoutSession: {
              id: "checkout-1",
              userId: "user-1",
              cartId: "cart-1",
              cart: {
                id: "cart-1",
                subtotal: 329900,
                discountTotal: 0,
                total: 329900,
                items: [
                  {
                    id: "cart-item-1",
                    listingId: "listing-1",
                    quantity: 1,
                    unitPrice: 329900,
                    titleSnapshot: "NordWave Edge S",
                    sellerSnapshot: "North Star Electronics",
                    listing: {
                      sellerId: "seller-1",
                      productId: "product-1",
                      variantId: "variant-1",
                      seller: {
                        id: "seller-1"
                      },
                      product: {
                        id: "product-1"
                      },
                      variant: {
                        id: "variant-1"
                      }
                    }
                  }
                ]
              },
              reservations: [
                {
                  id: "reservation-1",
                  inventoryItemId: "inventory-1",
                  quantity: 1,
                  status: "ACTIVE"
                }
              ],
              order: null
            }
          });
        }

        return Promise.resolve(null);
      }
    );

    const result = await paymentsService.confirmPaymentAttempt(
      viewer,
      "attempt-1",
      {
        scenario: "success"
      }
    );

    expect(tx.order.create).toHaveBeenCalledTimes(1);
    expect(tx.stockReservation.updateMany).toHaveBeenCalledWith({
      where: {
        id: "reservation-1",
        status: "ACTIVE"
      },
      data: {
        status: "CONSUMED",
        orderId: "order-1"
      }
    });
    expect(result.order?.number).toBe("VLR-20260312-ABCD1234");
    expect(result.attempt.status).toBe("SUCCEEDED");
  });

  it("treats duplicate webhook deliveries as replay-safe", async () => {
    tx.webhookDeliveryRecord.findUnique.mockResolvedValue({
      id: "delivery-1"
    });

    const payload = JSON.stringify({
      id: "evt_duplicate_1",
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_local_checkout1",
          status: "succeeded"
        }
      }
    });
    const timestamp = "1710237600";
    const signature = createHmac(
      "sha256",
      process.env.STRIPE_WEBHOOK_SECRET ?? "whsec_local_stage5"
    )
      .update(`${timestamp}.${payload}`)
      .digest("hex");

    const result = await paymentsService.handleStripeWebhook(
      payload,
      `t=${timestamp},v1=${signature}`
    );

    expect(result).toEqual({
      provider: "stripe",
      eventId: "evt_duplicate_1",
      duplicate: true,
      processed: true
    });
    expect(tx.paymentEvent.create).not.toHaveBeenCalled();
  });
});
