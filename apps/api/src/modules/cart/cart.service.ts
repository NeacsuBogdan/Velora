import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  addCartItemRequestSchema,
  applyCouponRequestSchema,
  cartDetailSchema,
  checkoutReservationSummarySchema,
  domainOverviewSchema,
  updateCartItemRequestSchema,
  type AuthenticatedUser,
  type CartDetail
} from "@velora/contracts";

import {
  createGuestCartToken,
  hashGuestCartToken,
  type CommerceContext
} from "../../common/commerce-context";
import { PrismaService } from "../database/prisma.service";
import { InventoryService } from "../inventory/inventory.service";
import type { PricingSnapshot } from "../promotions/pricing.helpers";
import { PromotionsService } from "../promotions/promotions.service";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../search/search.helpers";

type DatabaseClient = PrismaService | Prisma.TransactionClient;
type CartResult = CartDetail & { guestCartToken?: string };

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
    private readonly inventoryService: InventoryService,
    private readonly promotionsService: PromotionsService
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

  async getCart(context: CommerceContext): Promise<CartResult> {
    if (!context.user && !context.guestCartToken) {
      return this.buildEmptyCartResponse(true);
    }

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        new Date(),
        context.user?.id ?? null
      );

      const cartOwnership = await this.getOrCreateActiveCartRecord(tx, context, {
        createGuestCart: false
      });

      if (!cartOwnership) {
        return this.buildEmptyCartResponse(true);
      }

      const { cart, guestCartToken } = cartOwnership;
      await this.refreshCartItemSnapshots(tx, cart.id);
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cart.id
      );

      return this.buildCartResult(
        await this.buildCartResponse(tx, cart.id, pricing),
        guestCartToken
      );
    });
  }

  async addItem(context: CommerceContext, rawInput: unknown) {
    const input = addCartItemRequestSchema.parse(rawInput);

    return this.prisma.$transaction(async (tx) => {
      await this.inventoryService.releaseExpiredReservationsWithinTransaction(
        tx,
        new Date(),
        context.user?.id ?? null
      );

      const cartOwnership = await this.getOrCreateActiveCartRecord(tx, context, {
        createGuestCart: true
      });
      if (!cartOwnership) {
        throw new BadRequestException("A guest cart could not be created.");
      }
      const { cart, guestCartToken } = cartOwnership;
      await this.invalidateActiveCheckoutSessions(
        tx,
        cart.id,
        context.user?.id ?? null,
        "Cart contents changed before payment."
      );

      const { projection } = await this.requirePurchasableListing(
        tx,
        input.listingId
      );
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
          actorUserId: context.user?.id ?? undefined,
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
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cart.id
      );

      return this.buildCartResult(
        await this.buildCartResponse(tx, cart.id, pricing),
        guestCartToken
      );
    });
  }

  async applyCoupon(context: CommerceContext, rawInput: unknown) {
    const input = applyCouponRequestSchema.parse(rawInput);
    const normalizedCouponCode = input.couponCode.trim().toUpperCase();

    return this.prisma.$transaction(async (tx) => {
      const cartOwnership = await this.getOrCreateActiveCartRecord(tx, context, {
        createGuestCart: true
      });
      if (!cartOwnership) {
        throw new BadRequestException("A guest cart could not be created.");
      }
      const { cart, guestCartToken } = cartOwnership;
      await this.invalidateActiveCheckoutSessions(
        tx,
        cart.id,
        context.user?.id ?? null,
        "Coupon state changed before payment."
      );

      await tx.cart.update({
        where: {
          id: cart.id
        },
        data: {
          couponCode: normalizedCouponCode
        }
      });

      await this.refreshCartItemSnapshots(tx, cart.id);
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cart.id
      );

      if (
        !pricing.discounts.some(
          (discount) => discount.couponCode === normalizedCouponCode
        )
      ) {
        await tx.cart.update({
          where: {
            id: cart.id
          },
          data: {
            couponCode: null
          }
        });

        throw new ConflictException(
          "The coupon is inactive or not applicable to the current cart."
        );
      }

      await tx.auditLog.create({
        data: {
          actorUserId: context.user?.id ?? undefined,
          entityType: "CART",
          entityId: cart.id,
          action: "CART_COUPON_APPLIED",
          details: {
            couponCode: normalizedCouponCode
          }
        }
      });

      return this.buildCartResult(
        await this.buildCartResponse(tx, cart.id, pricing),
        guestCartToken
      );
    });
  }

  async updateItem(context: CommerceContext, itemId: string, rawInput: unknown) {
    const input = updateCartItemRequestSchema.parse(rawInput);

    return this.prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          id: itemId,
          cart: this.buildCartScopeWhere(context)
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
        context.user?.id ?? null,
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
          actorUserId: context.user?.id ?? undefined,
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
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cartItem.cartId
      );

      return this.buildCartResult(
        await this.buildCartResponse(tx, cartItem.cartId, pricing)
      );
    });
  }

  async removeItem(context: CommerceContext, itemId: string) {
    return this.prisma.$transaction(async (tx) => {
      const cartItem = await tx.cartItem.findFirst({
        where: {
          id: itemId,
          cart: this.buildCartScopeWhere(context)
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
        context.user?.id ?? null,
        "Cart contents changed before payment."
      );

      await tx.cartItem.delete({
        where: {
          id: cartItem.id
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: context.user?.id ?? undefined,
          entityType: "CART",
          entityId: cartItem.cartId,
          action: "CART_ITEM_REMOVED",
          details: {
            cartItemId: cartItem.id
          }
        }
      });

      await this.refreshCartItemSnapshots(tx, cartItem.cartId);
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cartItem.cartId
      );

      return this.buildCartResult(
        await this.buildCartResponse(tx, cartItem.cartId, pricing)
      );
    });
  }

  async removeCoupon(context: CommerceContext) {
    return this.prisma.$transaction(async (tx) => {
      const cartOwnership = await this.getOrCreateActiveCartRecord(tx, context, {
        createGuestCart: false
      });

      if (!cartOwnership) {
        throw new BadRequestException("No active cart exists for coupon removal.");
      }

      const { cart } = cartOwnership;
      await this.invalidateActiveCheckoutSessions(
        tx,
        cart.id,
        context.user?.id ?? null,
        "Coupon state changed before payment."
      );

      await tx.cart.update({
        where: {
          id: cart.id
        },
        data: {
          couponCode: null
        }
      });

      await this.refreshCartItemSnapshots(tx, cart.id);
      const pricing = await this.promotionsService.repriceCartWithinTransaction(
        tx,
        cart.id
      );

      await tx.auditLog.create({
        data: {
          actorUserId: context.user?.id ?? undefined,
          entityType: "CART",
          entityId: cart.id,
          action: "CART_COUPON_REMOVED"
        }
      });

      return this.buildCartResult(await this.buildCartResponse(tx, cart.id, pricing));
    });
  }

  async prepareCartForCheckout(
    tx: DatabaseClient,
    context: CommerceContext
  ): Promise<{ cart: CartRecord; pricing: PricingSnapshot }> {
    const cartOwnership = await this.getOrCreateActiveCartRecord(tx, context, {
      createGuestCart: false
    });

    if (!cartOwnership) {
      throw new BadRequestException("An active cart is required before checkout can start.");
    }

    const { cart } = cartOwnership;
    await this.refreshCartItemSnapshots(tx, cart.id);
    const pricing = await this.promotionsService.repriceCartWithinTransaction(
      tx as Prisma.TransactionClient,
      cart.id
    );

    return {
      cart: await this.loadCartRecord(tx, cart.id),
      pricing
    };
  }

  private async buildCartResponse(
    tx: DatabaseClient,
    cartId: string,
    pricing: PricingSnapshot
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
    const couponDiscountApplied = pricing.couponCode
      ? pricing.discounts.some(
          (discount) => discount.couponCode === pricing.couponCode
        )
      : false;

    if (items.length === 0) {
      notes.push("Your cart is empty. Add an item from a product detail page.");
    } else {
      notes.push("Inventory is only reserved once checkout starts.");
      notes.push(
        "Cart pricing is refreshed against the live catalog before reservations are created."
      );
    }

    if (pricing.couponCode && couponDiscountApplied) {
      notes.push(`Coupon ${pricing.couponCode} is currently applied.`);
    } else if (pricing.couponCode) {
      notes.push(
        `Coupon ${pricing.couponCode} is attached but not currently eligible for a discount.`
      );
    }

    if (pricing.discounts.length > 0) {
      notes.push(
        `${pricing.discounts.length} promotion adjustment(s) are reflected in the cart total.`
      );
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
      couponCode: pricing.couponCode,
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
      discounts: pricing.discounts,
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

  private async getOrCreateActiveCartRecord(
    tx: DatabaseClient,
    context: CommerceContext,
    options: {
      createGuestCart: boolean;
    }
  ): Promise<{ cart: { id: string }; guestCartToken?: string } | null> {
    if (context.user) {
      const existingCart = await tx.cart.findFirst({
        where: {
          userId: context.user.id,
          status: "ACTIVE"
        },
        orderBy: {
          updatedAt: "desc"
        }
      });

      if (existingCart) {
        return { cart: existingCart };
      }

      return {
        cart: await tx.cart.create({
          data: {
            userId: context.user.id,
            status: "ACTIVE",
            currency: "RON"
          }
        })
      };
    }

    const guestTokenHash = context.guestCartToken
      ? hashGuestCartToken(context.guestCartToken)
      : null;
    const existingGuestCart = guestTokenHash
      ? await tx.cart.findFirst({
          where: {
            guestTokenHash,
            userId: null,
            status: "ACTIVE"
          },
          orderBy: {
            updatedAt: "desc"
          }
        })
      : null;

    if (existingGuestCart) {
      return { cart: existingGuestCart };
    }

    if (!options.createGuestCart && !guestTokenHash) {
      return null;
    }

    const guestCartToken = context.guestCartToken ?? createGuestCartToken();
    const cart = await tx.cart.create({
      data: {
        guestTokenHash: hashGuestCartToken(guestCartToken),
        status: "ACTIVE",
        currency: "RON"
      }
    });

    return {
      cart,
      guestCartToken: context.guestCartToken ? undefined : guestCartToken
    };
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
    actorUserId: string | null,
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
          actorUserId: actorUserId ?? undefined,
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

  private buildCartScopeWhere(context: CommerceContext): Prisma.CartWhereInput {
    if (context.user) {
      return {
        userId: context.user.id,
        status: "ACTIVE" as const
      };
    }

    if (context.guestCartToken) {
      return {
        guestTokenHash: hashGuestCartToken(context.guestCartToken),
        userId: null,
        status: "ACTIVE" as const
      };
    }

    return {
      id: "__missing_cart_scope__"
    };
  }

  private buildCartResult(
    cart: CartDetail,
    guestCartToken?: string
  ): CartResult {
    if (!guestCartToken) {
      return cart;
    }

    return {
      ...cart,
      guestCartToken
    };
  }

  private buildEmptyCartResponse(isGuest: boolean): CartResult {
    return cartDetailSchema.parse({
      cartId: isGuest ? "guest-cart-preview" : "cart-preview",
      status: "ACTIVE",
      currency: "RON",
      couponCode: null,
      itemCount: 0,
      totals: {
        subtotal: {
          amount: 0,
          currency: "RON"
        },
        discountTotal: {
          amount: 0,
          currency: "RON"
        },
        total: {
          amount: 0,
          currency: "RON"
        }
      },
      items: [],
      discounts: [],
      activeCheckout: null,
      notes: isGuest
        ? [
            "Add an item to start a guest cart.",
            "You can continue to checkout without creating an account."
          ]
        : ["Your cart is empty. Add an item from a product detail page."]
    });
  }
}
