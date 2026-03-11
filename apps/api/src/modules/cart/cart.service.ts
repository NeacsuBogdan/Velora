import {
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  addCartItemRequestSchema,
  cartDetailSchema,
  checkoutReservationSummarySchema,
  domainOverviewSchema,
  updateCartItemRequestSchema,
  type AuthenticatedUser,
  type CartDetail
} from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";

type DatabaseClient = PrismaService | Prisma.TransactionClient;

const cartRecordInclude = Prisma.validator<Prisma.CartDefaultArgs>()({
  include: {
    items: {
      orderBy: {
        createdAt: "asc"
      },
      include: {
        listing: {
          include: searchProjectionListingInclude.include
        }
      }
    }
  }
});

type CartRecord = Prisma.CartGetPayload<typeof cartRecordInclude>;

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService
  ) {}

  async getOverview(viewer: AuthenticatedUser) {
    const [cartCount, activeCartCount, cartItemCount] = await Promise.all([
      this.prisma.cart.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? undefined
          : { userId: viewer.id }
      }),
      this.prisma.cart.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? { status: "ACTIVE" }
          : { userId: viewer.id, status: "ACTIVE" }
      }),
      this.prisma.cartItem.count({
        where: viewer.roles.some((role) => role.code === "ADMIN")
          ? undefined
          : { cart: { userId: viewer.id } }
      })
    ]);

    return domainOverviewSchema.parse({
      scope: "cart",
      metrics: {
        carts: cartCount,
        activeCarts: activeCartCount,
        cartItems: cartItemCount
      },
      notes: [
        viewer.roles.some((role) => role.code === "ADMIN")
          ? "Admin overview across customer carts."
          : "Customer-scoped cart visibility."
      ]
    });
  }

  async getCart(viewer: AuthenticatedUser): Promise<CartDetail> {
    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        new Date(),
        viewer.id
      );

      const cart = await this.getOrCreateActiveCartRecord(tx, viewer.id);
      await this.refreshCartItemSnapshots(tx, cart.id);
      await this.recalculateCartTotals(tx, cart.id);

      return this.buildCartResponse(tx, cart.id);
    });
  }

  async addItem(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = addCartItemRequestSchema.parse(rawInput);

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        new Date(),
        viewer.id
      );

      const cart = await this.getOrCreateActiveCartRecord(tx, viewer.id);
      await this.invalidateActiveCheckoutSessions(
        tx,
        cart.id,
        viewer.id,
        "Cart contents changed before payment."
      );

      const { projection } = await this.requirePurchasableListing(tx, input.listingId);
      const existing = await tx.cartItem.findUnique({
        where: {
          cartId_listingId: {
            cartId: cart.id,
            listingId: input.listingId
          }
        }
      });
      const nextQuantity = (existing?.quantity ?? 0) + input.quantity;

      if (nextQuantity > projection.availability.availableQuantity) {
        throw new ConflictException(
          "The cart quantity exceeds the currently available stock."
        );
      }

      await tx.cartItem.upsert({
        where: {
          cartId_listingId: {
            cartId: cart.id,
            listingId: input.listingId
          }
        },
        create: {
          cartId: cart.id,
          listingId: input.listingId,
          quantity: nextQuantity,
          unitPrice: projection.pricing.current.amount,
          currency: projection.pricing.current.currency,
          titleSnapshot: projection.title,
          sellerSnapshot: projection.seller.name,
          metadata: {
            productId: projection.productId,
            slug: projection.slug,
            subtitle: projection.subtitle
          }
        },
        update: {
          quantity: nextQuantity,
          unitPrice: projection.pricing.current.amount,
          currency: projection.pricing.current.currency,
          titleSnapshot: projection.title,
          sellerSnapshot: projection.seller.name,
          metadata: {
            productId: projection.productId,
            slug: projection.slug,
            subtitle: projection.subtitle
          }
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "CART",
          entityId: cart.id,
          action: "CART_ITEM_UPSERTED",
          details: {
            listingId: input.listingId,
            quantity: nextQuantity
          }
        }
      });

      await this.refreshCartItemSnapshots(tx, cart.id);
      await this.recalculateCartTotals(tx, cart.id);

      return this.buildCartResponse(tx, cart.id);
    });
  }

  async updateItem(
    viewer: AuthenticatedUser,
    itemId: string,
    rawInput: unknown
  ) {
    const input = updateCartItemRequestSchema.parse(rawInput);

    return this.prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          id: itemId,
          cart: {
            userId: viewer.id,
            status: "ACTIVE"
          }
        },
        select: {
          id: true,
          cartId: true,
          listingId: true
        }
      });

      if (!cartItem) {
        throw new NotFoundException(`Cart item ${itemId} was not found.`);
      }

      await this.invalidateActiveCheckoutSessions(
        tx,
        cartItem.cartId,
        viewer.id,
        "Cart quantities changed before payment."
      );

      if (input.quantity === 0) {
        await tx.cartItem.delete({
          where: {
            id: cartItem.id
          }
        });
      } else {
        const { projection } = await this.requirePurchasableListing(
          tx,
          cartItem.listingId
        );

        if (input.quantity > projection.availability.availableQuantity) {
          throw new ConflictException(
            "The cart quantity exceeds the currently available stock."
          );
        }

        await tx.cartItem.update({
          where: {
            id: cartItem.id
          },
          data: {
            quantity: input.quantity,
            unitPrice: projection.pricing.current.amount,
            currency: projection.pricing.current.currency,
            titleSnapshot: projection.title,
            sellerSnapshot: projection.seller.name,
            metadata: {
              productId: projection.productId,
              slug: projection.slug,
              subtitle: projection.subtitle
            }
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "CART",
          entityId: cartItem.cartId,
          action: "CART_ITEM_UPDATED",
          details: {
            cartItemId: cartItem.id,
            quantity: input.quantity
          }
        }
      });

      await this.refreshCartItemSnapshots(tx, cartItem.cartId);
      await this.recalculateCartTotals(tx, cartItem.cartId);

      return this.buildCartResponse(tx, cartItem.cartId);
    });
  }

  async removeItem(viewer: AuthenticatedUser, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          id: itemId,
          cart: {
            userId: viewer.id,
            status: "ACTIVE"
          }
        },
        select: {
          id: true,
          cartId: true
        }
      });

      if (!cartItem) {
        throw new NotFoundException(`Cart item ${itemId} was not found.`);
      }

      await this.invalidateActiveCheckoutSessions(
        tx,
        cartItem.cartId,
        viewer.id,
        "Cart contents changed before payment."
      );

      await tx.cartItem.delete({
        where: {
          id: cartItem.id
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "CART",
          entityId: cartItem.cartId,
          action: "CART_ITEM_REMOVED",
          details: {
            cartItemId: cartItem.id
          }
        }
      });

      await this.refreshCartItemSnapshots(tx, cartItem.cartId);
      await this.recalculateCartTotals(tx, cartItem.cartId);

      return this.buildCartResponse(tx, cartItem.cartId);
    });
  }

  async prepareCartForCheckout(
    tx: DatabaseClient,
    userId: string
  ): Promise<CartRecord> {
    const cart = await this.getOrCreateActiveCartRecord(tx, userId);
    await this.refreshCartItemSnapshots(tx, cart.id);
    await this.recalculateCartTotals(tx, cart.id);
    return this.loadCartRecord(tx, cart.id);
  }

  private async buildCartResponse(
    tx: DatabaseClient,
    cartId: string
  ): Promise<CartDetail> {
    const [cart, activeCheckout] = await Promise.all([
      this.loadCartRecord(tx, cartId),
      this.loadActiveCheckout(tx, cartId)
    ]);

    const items = cart.items.map((item) => {
      const projection = buildSearchDocument(item.listing);
      const lineTotal = item.unitPrice * item.quantity;
      const canFulfill =
        projection.availability.inStock &&
        item.quantity <= projection.availability.availableQuantity;

      return {
        itemId: item.id,
        listingId: item.listingId,
        productId: projection.productId,
        slug: projection.slug,
        title: projection.title,
        subtitle: projection.subtitle,
        seller: projection.seller,
        quantity: item.quantity,
        image: projection.image,
        availability: projection.availability,
        pricing: {
          unit: {
            amount: item.unitPrice,
            currency: item.currency
          },
          lineTotal: {
            amount: lineTotal,
            currency: item.currency
          }
        },
        canFulfill
      };
    });

    const notes = [];

    if (items.length === 0) {
      notes.push("Your cart is empty. Add an item from a product detail page.");
    } else {
      notes.push("Inventory is only reserved once checkout starts.");
      notes.push("Cart pricing is refreshed against the live catalog before reservations are created.");
    }

    if (items.some((item) => !item.canFulfill)) {
      notes.push(
        "One or more item quantities exceed the currently available inventory."
      );
    }

    if (activeCheckout) {
      notes.push(
        `A checkout reservation is active until ${activeCheckout.reservationExpiresAt}.`
      );
    }

    return cartDetailSchema.parse({
      cartId: cart.id,
      status: cart.status,
      currency: cart.currency,
      itemCount: items.reduce((count, item) => count + item.quantity, 0),
      totals: {
        subtotal: {
          amount: cart.subtotal,
          currency: cart.currency
        },
        discountTotal: {
          amount: cart.discountTotal,
          currency: cart.currency
        },
        total: {
          amount: cart.total,
          currency: cart.currency
        }
      },
      items,
      activeCheckout,
      notes
    });
  }

  private async loadActiveCheckout(tx: DatabaseClient, cartId: string) {
    const checkoutSession = await tx.checkoutSession.findFirst({
      where: {
        cartId,
        status: {
          in: ["STARTED", "PAYMENT_PENDING"]
        },
        reservationExpiresAt: {
          gt: new Date()
        }
      },
      orderBy: {
        createdAt: "desc"
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

    if (!checkoutSession || !checkoutSession.reservationExpiresAt) {
      return null;
    }

    return checkoutReservationSummarySchema.parse({
      checkoutSessionId: checkoutSession.id,
      status: checkoutSession.status,
      amount: {
        amount: checkoutSession.amount,
        currency: checkoutSession.currency
      },
      reservationExpiresAt: checkoutSession.reservationExpiresAt.toISOString(),
      reservationCount: checkoutSession.reservations.length,
      reservedUnits: checkoutSession.reservations.reduce(
        (count, reservation) => count + reservation.quantity,
        0
      )
    });
  }

  private async loadCartRecord(
    tx: DatabaseClient,
    cartId: string
  ): Promise<CartRecord> {
    const cart = await tx.cart.findUnique({
      where: {
        id: cartId
      },
      include: cartRecordInclude.include
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found.`);
    }

    return cart;
  }

  private async refreshCartItemSnapshots(tx: DatabaseClient, cartId: string) {
    const cartItems = await tx.cartItem.findMany({
      where: {
        cartId
      },
      include: {
        listing: {
          include: searchProjectionListingInclude.include
        }
      }
    });

    for (const item of cartItems) {
      const projection = buildSearchDocument(item.listing);

      if (projection.pricing.current.amount <= 0) {
        continue;
      }

      await tx.cartItem.update({
        where: {
          id: item.id
        },
        data: {
          unitPrice: projection.pricing.current.amount,
          currency: projection.pricing.current.currency,
          titleSnapshot: projection.title,
          sellerSnapshot: projection.seller.name,
          metadata: {
            productId: projection.productId,
            slug: projection.slug,
            subtitle: projection.subtitle
          }
        }
      });
    }
  }

  private async recalculateCartTotals(tx: DatabaseClient, cartId: string) {
    const cartItems = await tx.cartItem.findMany({
      where: {
        cartId
      },
      select: {
        quantity: true,
        unitPrice: true
      }
    });

    const subtotal = cartItems.reduce(
      (sum, item) => sum + item.unitPrice * item.quantity,
      0
    );

    await tx.cart.update({
      where: {
        id: cartId
      },
      data: {
        subtotal,
        discountTotal: 0,
        total: subtotal
      }
    });
  }

  private async getOrCreateActiveCartRecord(
    tx: DatabaseClient,
    userId: string
  ) {
    const existingCart = await tx.cart.findFirst({
      where: {
        userId,
        status: "ACTIVE"
      },
      orderBy: {
        updatedAt: "desc"
      }
    });

    if (existingCart) {
      return existingCart;
    }

    return tx.cart.create({
      data: {
        userId,
        status: "ACTIVE",
        currency: "RON"
      }
    });
  }

  private async requirePurchasableListing(
    tx: DatabaseClient,
    listingId: string
  ) {
    const listing = await tx.sellerProductListing.findUnique({
      where: {
        id: listingId
      },
      include: searchProjectionListingInclude.include
    });

    if (
      !listing ||
      !listing.isActive ||
      listing.status !== "ACTIVE" ||
      listing.product.status !== "ACTIVE"
    ) {
      throw new NotFoundException(`Listing ${listingId} was not found.`);
    }

    if (!listing.inventoryItem) {
      throw new ConflictException("The listing is missing inventory coverage.");
    }

    const projection = buildSearchDocument(listing);

    if (projection.pricing.current.amount <= 0) {
      throw new ConflictException("The listing does not have an active price.");
    }

    return {
      listing,
      projection
    };
  }

  private async invalidateActiveCheckoutSessions(
    tx: DatabaseClient,
    cartId: string,
    actorUserId: string,
    note: string
  ) {
    const checkoutSessions = await tx.checkoutSession.findMany({
      where: {
        cartId,
        status: {
          in: ["STARTED", "PAYMENT_PENDING"]
        }
      },
      select: {
        id: true
      }
    });

    for (const checkoutSession of checkoutSessions) {
      const releaseSummary =
        await this.inventoryService.releaseReservationsForCheckoutSessionWithinTransaction(
          tx as Prisma.TransactionClient,
          checkoutSession.id,
          actorUserId,
          note
        );

      await tx.checkoutSession.updateMany({
        where: {
          id: checkoutSession.id
        },
        data: {
          status: "EXPIRED",
          reservationExpiresAt: new Date()
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId,
          entityType: "CHECKOUT_SESSION",
          entityId: checkoutSession.id,
          action: "CHECKOUT_SESSION_INVALIDATED",
          details: {
            note,
            releasedReservations: releaseSummary.releasedReservations
          }
        }
      });
    }
  }
}
