import {
  Prisma,
  PrismaClient,
  CartStatus,
  CheckoutStatus,
  CouponStatus,
  InventoryMovementType,
  InventoryReservationStatus,
  JobStatus,
  NotificationKind,
  NotificationLevel,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  PromotionFundingSource,
  PromotionStackingMode,
  PromotionType,
  SearchSyncStatus,
  SellerApplicationStatus,
  SellerStatus,
  UserRoleCode,
  WebhookDeliveryStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { createPrismaAdapter } from "../src/modules/database/prisma-adapter";
import {
  buildSearchDocument,
  searchProjectionListingInclude
} from "../src/modules/search/search.helpers";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter()
});

type SeedProductBlueprint = {
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  brandSlug: string;
  sellerSlug: string;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  leadTimeDays: number;
  variantTitle: string;
  variantAttributes: Record<string, string>;
  attributes: Array<[string, string]>;
  specifications: Array<[string, string, string]>;
  secondaryOffer?: {
    sellerSlug: string;
    price: number;
    compareAtPrice: number | null;
    stock: number;
    leadTimeDays: number;
  };
};

async function seedRoles(): Promise<void> {
  const roles = [
    {
      code: UserRoleCode.ADMIN,
      name: "Administrator",
      description: "Backoffice and operational access."
    },
    {
      code: UserRoleCode.SELLER,
      name: "Seller",
      description: "Merchant-facing operational access."
    },
    {
      code: UserRoleCode.CUSTOMER,
      name: "Customer",
      description: "Customer storefront access."
    }
  ];

  for (const role of roles) {
    await prisma.role.upsert({
      where: { code: role.code },
      update: role,
      create: role
    });
  }
}

async function seedUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash("Demo123!", 10);

  const users = [
    {
      email: "admin@velora.local",
      firstName: "Platform",
      lastName: "Admin",
      roles: [UserRoleCode.ADMIN]
    },
    {
      email: "seller@velora.local",
      firstName: "Verified",
      lastName: "Merchant",
      roles: [UserRoleCode.SELLER]
    },
    {
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      roles: [UserRoleCode.CUSTOMER]
    }
  ];

  for (const user of users) {
    const savedUser = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        isActive: true
      },
      create: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        passwordHash,
        isActive: true
      }
    });

    for (const roleCode of user.roles) {
      const role = await prisma.role.findUniqueOrThrow({
        where: { code: roleCode }
      });

      await prisma.userRoleAssignment.upsert({
        where: {
          userId_roleId: {
            userId: savedUser.id,
            roleId: role.id
          }
        },
        update: {},
        create: {
          userId: savedUser.id,
          roleId: role.id
        }
      });
    }
  }
}

async function seedCatalogAndCommerce(): Promise<void> {
  const sellerOwner = await prisma.user.findUniqueOrThrow({
    where: { email: "seller@velora.local" }
  });
  const customer = await prisma.user.findUniqueOrThrow({
    where: { email: "customer@velora.local" }
  });
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@velora.local" }
  });
  const bootstrapOrderPlacedAt = new Date(
    Date.now() - 2 * 24 * 60 * 60 * 1000
  );

  const addressSeeds = [
    {
      id: "seed-stage7-address-shipping-home",
      type: "SHIPPING" as const,
      label: "Home delivery",
      fullName: "Demo Customer",
      line1: "Strada Fabrica de Glucoza 12",
      line2: "Building B, Apartment 54",
      city: "Bucharest",
      state: "Bucuresti",
      postalCode: "020331",
      countryCode: "RO",
      phone: "+40 721 000 111",
      isDefault: true
    },
    {
      id: "seed-stage7-address-billing-office",
      type: "BILLING" as const,
      label: "Billing office",
      fullName: "Demo Customer",
      line1: "Bulevardul Dimitrie Pompeiu 9-9A",
      line2: "North Gate, Floor 6",
      city: "Bucharest",
      state: "Bucuresti",
      postalCode: "020335",
      countryCode: "RO",
      phone: "+40 721 000 111",
      isDefault: true
    }
  ];

  for (const addressSeed of addressSeeds) {
    await prisma.address.upsert({
      where: { id: addressSeed.id },
      update: {
        userId: customer.id,
        type: addressSeed.type,
        label: addressSeed.label,
        fullName: addressSeed.fullName,
        line1: addressSeed.line1,
        line2: addressSeed.line2,
        city: addressSeed.city,
        state: addressSeed.state,
        postalCode: addressSeed.postalCode,
        countryCode: addressSeed.countryCode,
        phone: addressSeed.phone,
        isDefault: addressSeed.isDefault
      },
      create: {
        id: addressSeed.id,
        userId: customer.id,
        type: addressSeed.type,
        label: addressSeed.label,
        fullName: addressSeed.fullName,
        line1: addressSeed.line1,
        line2: addressSeed.line2,
        city: addressSeed.city,
        state: addressSeed.state,
        postalCode: addressSeed.postalCode,
        countryCode: addressSeed.countryCode,
        phone: addressSeed.phone,
        isDefault: addressSeed.isDefault
      }
    });
  }

  const seller = await prisma.seller.upsert({
    where: { slug: "north-star-electronics" },
    update: {
      displayName: "North Star Electronics",
      legalName: "North Star Electronics SRL",
      contactEmail: "seller@velora.local",
      ownerUserId: sellerOwner.id,
      status: SellerStatus.ACTIVE
    },
    create: {
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      legalName: "North Star Electronics SRL",
      contactEmail: "seller@velora.local",
      ownerUserId: sellerOwner.id,
      status: SellerStatus.ACTIVE
    }
  });

  const rootElectronics = await prisma.category.upsert({
    where: { slug: "electronics" },
    update: {
      name: "Electronics",
      description: "Consumer electronics and connected devices.",
      sortOrder: 1
    },
    create: {
      slug: "electronics",
      name: "Electronics",
      description: "Consumer electronics and connected devices.",
      sortOrder: 1
    }
  });

  const phonesCategory = await prisma.category.upsert({
    where: { slug: "phones" },
    update: {
      name: "Phones",
      description: "Smartphones and companion devices.",
      parentId: rootElectronics.id,
      sortOrder: 1
    },
    create: {
      slug: "phones",
      name: "Phones",
      description: "Smartphones and companion devices.",
      parentId: rootElectronics.id,
      sortOrder: 1
    }
  });

  const brand = await prisma.brand.upsert({
    where: { slug: "astra-mobile" },
    update: {
      name: "Astra Mobile"
    },
    create: {
      slug: "astra-mobile",
      name: "Astra Mobile"
    }
  });

  const product = await prisma.product.upsert({
    where: { slug: "astra-x1-pro" },
    update: {
      title: "Astra X1 Pro",
      description: "A premium 6.7 inch flagship device with fast charging.",
      status: ProductStatus.ACTIVE,
      brandId: brand.id,
      categoryId: phonesCategory.id
    },
    create: {
      slug: "astra-x1-pro",
      title: "Astra X1 Pro",
      description: "A premium 6.7 inch flagship device with fast charging.",
      status: ProductStatus.ACTIVE,
      brandId: brand.id,
      categoryId: phonesCategory.id
    }
  });

  const variant = await prisma.productVariant.upsert({
    where: { sku: "VEL-000001" },
    update: {
      productId: product.id,
      title: "Midnight 256 GB",
      attributes: { color: "Midnight", storage: "256GB" },
      isDefault: true
    },
    create: {
      sku: "VEL-000001",
      productId: product.id,
      title: "Midnight 256 GB",
      attributes: { color: "Midnight", storage: "256GB" },
      isDefault: true
    }
  });

  await prisma.productMedia.upsert({
    where: { id: "seed-stage1-product-media" },
    update: {
      productId: product.id,
      storageKey: "catalog/astra-x1-pro/hero.png",
      url: "https://placehold.co/800x800/png?text=Astra+X1+Pro",
      altText: "Astra X1 Pro product hero",
      sortOrder: 1
    },
    create: {
      id: "seed-stage1-product-media",
      productId: product.id,
      storageKey: "catalog/astra-x1-pro/hero.png",
      url: "https://placehold.co/800x800/png?text=Astra+X1+Pro",
      altText: "Astra X1 Pro product hero",
      sortOrder: 1
    }
  });

  await prisma.productAttribute.upsert({
    where: { id: "seed-stage1-product-attribute" },
    update: {
      productId: product.id,
      name: "Display",
      value: "6.7 inch OLED"
    },
    create: {
      id: "seed-stage1-product-attribute",
      productId: product.id,
      name: "Display",
      value: "6.7 inch OLED"
    }
  });

  await prisma.productSpecification.upsert({
    where: { id: "seed-stage1-product-specification" },
    update: {
      productId: product.id,
      groupName: "Performance",
      label: "Chipset",
      value: "Astra Neural A1"
    },
    create: {
      id: "seed-stage1-product-specification",
      productId: product.id,
      groupName: "Performance",
      label: "Chipset",
      value: "Astra Neural A1"
    }
  });

  const listing = await prisma.sellerProductListing.upsert({
    where: { sellerSku: "NST-AX1P-256" },
    update: {
      sellerId: seller.id,
      productId: product.id,
      variantId: variant.id,
      status: ProductStatus.ACTIVE,
      isActive: true
    },
    create: {
      sellerId: seller.id,
      productId: product.id,
      variantId: variant.id,
      sellerSku: "NST-AX1P-256",
      status: ProductStatus.ACTIVE,
      isActive: true
    }
  });

  await prisma.price.upsert({
    where: { id: "seed-stage1-price" },
    update: {
      listingId: listing.id,
      amount: 449900,
      currency: "RON",
      compareAtAmount: 479900
    },
    create: {
      id: "seed-stage1-price",
      listingId: listing.id,
      amount: 449900,
      currency: "RON",
      compareAtAmount: 479900
    }
  });

  const inventoryItem = await prisma.inventoryItem.upsert({
    where: { listingId: listing.id },
    update: {
      onHand: 12,
      reserved: 1,
      safetyStock: 2
    },
    create: {
      listingId: listing.id,
      onHand: 12,
      reserved: 1,
      safetyStock: 2
    }
  });

  const cart = await prisma.cart.upsert({
    where: { id: "seed-stage1-cart" },
    update: {
      userId: customer.id,
      status: CartStatus.ACTIVE,
      subtotal: 449900,
      total: 449900
    },
    create: {
      id: "seed-stage1-cart",
      userId: customer.id,
      status: CartStatus.ACTIVE,
      subtotal: 449900,
      total: 449900
    }
  });

  await prisma.cartItem.upsert({
    where: {
      cartId_listingId: {
        cartId: cart.id,
        listingId: listing.id
      }
    },
    update: {
      quantity: 1,
      unitPrice: 449900,
      titleSnapshot: product.title,
      sellerSnapshot: seller.displayName
    },
    create: {
      cartId: cart.id,
      listingId: listing.id,
      quantity: 1,
      unitPrice: 449900,
      titleSnapshot: product.title,
      sellerSnapshot: seller.displayName
    }
  });

  const checkoutSession = await prisma.checkoutSession.upsert({
    where: { idempotencyKey: "seed-stage1-checkout" },
    update: {
      cartId: cart.id,
      userId: customer.id,
      status: CheckoutStatus.PAYMENT_PENDING,
      amount: 449900,
      reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000)
    },
    create: {
      cartId: cart.id,
      userId: customer.id,
      status: CheckoutStatus.PAYMENT_PENDING,
      amount: 449900,
      reservationExpiresAt: new Date(Date.now() + 15 * 60 * 1000),
      idempotencyKey: "seed-stage1-checkout"
    }
  });

  const reservation = await prisma.stockReservation.upsert({
    where: { id: "seed-stage1-reservation" },
    update: {
      inventoryItemId: inventoryItem.id,
      cartId: cart.id,
      checkoutSessionId: checkoutSession.id,
      quantity: 1,
      status: InventoryReservationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    },
    create: {
      id: "seed-stage1-reservation",
      inventoryItemId: inventoryItem.id,
      cartId: cart.id,
      checkoutSessionId: checkoutSession.id,
      quantity: 1,
      status: InventoryReservationStatus.ACTIVE,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000)
    }
  });

  await prisma.inventoryMovement.upsert({
    where: { id: "seed-stage1-inventory-movement" },
    update: {
      inventoryItemId: inventoryItem.id,
      reservationId: reservation.id,
      delta: -1,
      type: InventoryMovementType.RESERVATION,
      note: "Reserved for Stage 1 checkout bootstrap."
    },
    create: {
      id: "seed-stage1-inventory-movement",
      inventoryItemId: inventoryItem.id,
      reservationId: reservation.id,
      delta: -1,
      type: InventoryMovementType.RESERVATION,
      note: "Reserved for Stage 1 checkout bootstrap."
    }
  });

  const paymentAttempt = await prisma.paymentAttempt.upsert({
    where: {
      provider_idempotencyKey: {
        provider: "stripe",
        idempotencyKey: "seed-stage1-payment-attempt"
      }
    },
    update: {
      checkoutSessionId: checkoutSession.id,
      providerPaymentIntentId: "pi_stage1_bootstrap",
      status: PaymentStatus.SUCCEEDED,
      amount: 449900
    },
    create: {
      checkoutSessionId: checkoutSession.id,
      provider: "stripe",
      providerPaymentIntentId: "pi_stage1_bootstrap",
      idempotencyKey: "seed-stage1-payment-attempt",
      status: PaymentStatus.SUCCEEDED,
      amount: 449900
    }
  });

  await prisma.paymentEvent.upsert({
    where: { externalEventId: "evt_stage1_payment_succeeded" },
    update: {
      paymentAttemptId: paymentAttempt.id,
      type: "payment_intent.succeeded",
      payload: {
        id: "evt_stage1_payment_succeeded",
        paymentIntentId: "pi_stage1_bootstrap"
      },
      status: PaymentStatus.SUCCEEDED
    },
    create: {
      paymentAttemptId: paymentAttempt.id,
      externalEventId: "evt_stage1_payment_succeeded",
      type: "payment_intent.succeeded",
      payload: {
        id: "evt_stage1_payment_succeeded",
        paymentIntentId: "pi_stage1_bootstrap"
      },
      status: PaymentStatus.SUCCEEDED
    }
  });

  const order = await prisma.order.upsert({
    where: { number: "VEL-2026-0001" },
    update: {
      userId: customer.id,
      sellerId: seller.id,
      checkoutSessionId: checkoutSession.id,
      paymentAttemptId: paymentAttempt.id,
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      subtotal: 449900,
      total: 449900,
      placedAt: bootstrapOrderPlacedAt
    },
    create: {
      number: "VEL-2026-0001",
      userId: customer.id,
      sellerId: seller.id,
      checkoutSessionId: checkoutSession.id,
      paymentAttemptId: paymentAttempt.id,
      status: OrderStatus.PAID,
      paymentStatus: PaymentStatus.SUCCEEDED,
      subtotal: 449900,
      total: 449900,
      placedAt: bootstrapOrderPlacedAt
    }
  });

  const orderItem = await prisma.orderItem.upsert({
    where: { id: "seed-stage1-order-item" },
    update: {
      orderId: order.id,
      listingId: listing.id,
      productId: product.id,
      variantId: variant.id,
      quantity: 1,
      unitPrice: 449900,
      totalPrice: 449900,
      productTitleSnapshot: product.title,
      sellerNameSnapshot: seller.displayName
    },
    create: {
      id: "seed-stage1-order-item",
      orderId: order.id,
      listingId: listing.id,
      productId: product.id,
      variantId: variant.id,
      quantity: 1,
      unitPrice: 449900,
      totalPrice: 449900,
      productTitleSnapshot: product.title,
      sellerNameSnapshot: seller.displayName
    }
  });

  const orderHistorySeeds = [
    {
      id: "seed-stage1-order-history-created",
      status: OrderStatus.CREATED,
      note: "Checkout session converted into a confirmed order shell.",
      createdAt: new Date(bootstrapOrderPlacedAt.getTime() - 25 * 60 * 1000)
    },
    {
      id: "seed-stage1-order-history-payment-pending",
      status: OrderStatus.PAYMENT_PENDING,
      note: "PaymentIntent entered the pending confirmation state.",
      createdAt: new Date(bootstrapOrderPlacedAt.getTime() - 12 * 60 * 1000)
    },
    {
      id: "seed-stage1-order-history-paid",
      status: OrderStatus.PAID,
      note: "Bootstrap order settled for Stage 1.",
      createdAt: bootstrapOrderPlacedAt
    }
  ];

  await prisma.orderStatusHistory.deleteMany({
    where: {
      id: "seed-stage1-order-history"
    }
  });

  for (const historySeed of orderHistorySeeds) {
    await prisma.orderStatusHistory.upsert({
      where: { id: historySeed.id },
      update: {
        orderId: order.id,
        actorUserId: admin.id,
        status: historySeed.status,
        note: historySeed.note,
        createdAt: historySeed.createdAt
      },
      create: {
        id: historySeed.id,
        orderId: order.id,
        actorUserId: admin.id,
        status: historySeed.status,
        note: historySeed.note,
        createdAt: historySeed.createdAt
      }
    });
  }

  await prisma.shipment.upsert({
    where: { id: "seed-stage1-shipment" },
    update: {
      orderId: order.id,
      trackingNumber: "VELORA-STAGE1",
      carrier: "Demo Logistics",
      status: "READY"
    },
    create: {
      id: "seed-stage1-shipment",
      orderId: order.id,
      trackingNumber: "VELORA-STAGE1",
      carrier: "Demo Logistics",
      status: "READY"
    }
  });

  await prisma.returnRequest.upsert({
    where: { id: "seed-stage1-return-request" },
    update: {
      orderId: order.id,
      orderItemId: orderItem.id,
      reason: "Packaging issue",
      status: "REVIEW_PENDING"
    },
    create: {
      id: "seed-stage1-return-request",
      orderId: order.id,
      orderItemId: orderItem.id,
      reason: "Packaging issue",
      status: "REVIEW_PENDING"
    }
  });

  const promotionSeeds = [
    {
      name: "Welcome 5%",
      code: "WELCOME5",
      description: "Coupon-backed onboarding discount for first cart validation flows.",
      ownerSellerId: null,
      type: PromotionType.PERCENTAGE,
      fundingSource: PromotionFundingSource.PLATFORM,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 10,
      ruleId: "seed-stage6-promotion-rule-welcome",
      ruleName: "5 percent off order total",
      configuration: { percentage: 5 },
      coupons: [
        {
          code: "DEMO5",
          status: CouponStatus.ACTIVE,
          usageLimit: 100
        }
      ]
    },
    {
      name: "Phones launch 10%",
      code: "PHONE10",
      description: "Automatic category discount for phone listings in the seeded catalog.",
      ownerSellerId: null,
      type: PromotionType.CATEGORY_DISCOUNT,
      fundingSource: PromotionFundingSource.PLATFORM,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 20,
      ruleId: "seed-stage6-promotion-rule-phone10",
      ruleName: "10 percent off phones",
      configuration: {
        categorySlugs: ["phones"],
        percentage: 10
      },
      coupons: []
    },
    {
      name: "Basket 150 RON",
      code: "BASKET150",
      description: "Threshold discount once the seeded cart reaches a higher basket value.",
      ownerSellerId: null,
      type: PromotionType.CART_THRESHOLD,
      fundingSource: PromotionFundingSource.PLATFORM,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 30,
      ruleId: "seed-stage6-promotion-rule-basket150",
      ruleName: "150 RON off orders above threshold",
      configuration: {
        thresholdAmount: 700000,
        amount: 15000
      },
      coupons: []
    },
    {
      name: "TV & audio 3 for 2",
      code: "AUDIO3FOR2",
      description: "Bundle logic seed for buy-x-get-y coverage in the promotion engine.",
      ownerSellerId: null,
      type: PromotionType.BUY_X_GET_Y,
      fundingSource: PromotionFundingSource.SHARED,
      sellerFundingSharePercent: 40,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 40,
      ruleId: "seed-stage6-promotion-rule-audio3for2",
      ruleName: "Buy two get one free in TV & audio",
      configuration: {
        categorySlugs: ["tv-audio"],
        buyQuantity: 2,
        getQuantity: 1
      },
      coupons: []
    },
    {
      name: "VIP 250 RON",
      code: "VIP250",
      description: "Exclusive fixed discount reserved for a dedicated coupon flow.",
      ownerSellerId: null,
      type: PromotionType.FIXED_AMOUNT,
      fundingSource: PromotionFundingSource.PLATFORM,
      stackingMode: PromotionStackingMode.EXCLUSIVE,
      priority: 5,
      ruleId: "seed-stage6-promotion-rule-vip250",
      ruleName: "250 RON off as an exclusive promotion",
      configuration: {
        amount: 25000
      },
      coupons: [
        {
          code: "VIP250",
          status: CouponStatus.ACTIVE,
          usageLimit: 25
        }
      ]
    },
    {
      name: "NordWave Edge S platform launch",
      code: "EDGE-S-LAUNCH",
      description: "Product-specific markdown funded by the marketplace for the launch flagship listing.",
      ownerSellerId: null,
      type: PromotionType.FIXED_AMOUNT,
      fundingSource: PromotionFundingSource.PLATFORM,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 15,
      ruleId: "seed-stage6-promotion-rule-edge-launch",
      ruleName: "100 RON off the NordWave Edge S launch offer",
      configuration: {
        amount: 10000,
        listingIds: [listing.id]
      },
      coupons: []
    },
    {
      name: "North Star seller weekend",
      code: "NST-WEEKEND",
      description: "Seller-funded listing campaign for the seeded merchant flagship offer.",
      ownerSellerId: seller.id,
      type: PromotionType.PERCENTAGE,
      fundingSource: PromotionFundingSource.SELLER,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 300,
      ruleId: "seed-stage12-promotion-rule-seller-weekend",
      ruleName: "8 percent off the seller flagship listing",
      configuration: {
        percentage: 8,
        listingIds: [listing.id]
      },
      coupons: []
    }
  ];

  const promotionRecords = new Map<string, { id: string }>();

  for (const promotionSeed of promotionSeeds) {
    const promotionRecord = await prisma.promotion.upsert({
      where: { code: promotionSeed.code },
      update: {
        name: promotionSeed.name,
        ownerSellerId: promotionSeed.ownerSellerId,
        description: promotionSeed.description,
        type: promotionSeed.type,
        fundingSource: promotionSeed.fundingSource,
        sellerFundingSharePercent:
          promotionSeed.fundingSource === PromotionFundingSource.SHARED
            ? promotionSeed.sellerFundingSharePercent ?? null
            : null,
        stackingMode: promotionSeed.stackingMode,
        priority: promotionSeed.priority,
        isActive: true
      },
      create: {
        name: promotionSeed.name,
        code: promotionSeed.code,
        ownerSellerId: promotionSeed.ownerSellerId,
        description: promotionSeed.description,
        type: promotionSeed.type,
        fundingSource: promotionSeed.fundingSource,
        sellerFundingSharePercent:
          promotionSeed.fundingSource === PromotionFundingSource.SHARED
            ? promotionSeed.sellerFundingSharePercent ?? null
            : null,
        stackingMode: promotionSeed.stackingMode,
        priority: promotionSeed.priority,
        isActive: true
      }
    });

    promotionRecords.set(promotionSeed.code, {
      id: promotionRecord.id
    });

    await prisma.promotionRule.upsert({
      where: { id: promotionSeed.ruleId },
      update: {
        promotionId: promotionRecord.id,
        name: promotionSeed.ruleName,
        configuration: promotionSeed.configuration
      },
      create: {
        id: promotionSeed.ruleId,
        promotionId: promotionRecord.id,
        name: promotionSeed.ruleName,
        configuration: promotionSeed.configuration
      }
    });

    for (const coupon of promotionSeed.coupons) {
      await prisma.coupon.upsert({
        where: { code: coupon.code },
        update: {
          promotionId: promotionRecord.id,
          status: coupon.status,
          usageLimit: coupon.usageLimit
        },
        create: {
          promotionId: promotionRecord.id,
          code: coupon.code,
          status: coupon.status,
          usageLimit: coupon.usageLimit
        }
      });
    }
  }

  const welcomePromotion = promotionRecords.get("WELCOME5");

  await prisma.appliedDiscountSnapshot.upsert({
    where: { id: "seed-stage1-discount-snapshot" },
    update: {
      orderId: order.id,
      promotionId: welcomePromotion?.id,
      couponCode: "DEMO5",
      label: "Welcome 5%",
      amount: 22500,
      fundingSource: PromotionFundingSource.PLATFORM,
      sellerFundedAmount: 0,
      platformFundedAmount: 22500,
      metadata: { source: "bootstrap-seed" }
    },
    create: {
      id: "seed-stage1-discount-snapshot",
      orderId: order.id,
      promotionId: welcomePromotion?.id,
      couponCode: "DEMO5",
      label: "Welcome 5%",
      amount: 22500,
      fundingSource: PromotionFundingSource.PLATFORM,
      sellerFundedAmount: 0,
      platformFundedAmount: 22500,
      metadata: { source: "bootstrap-seed" }
    }
  });

  await prisma.searchDocument.upsert({
    where: { listingId: listing.id },
    update: {
      documentId: `listing-${listing.id}`,
      listingId: listing.id,
      payload: {
        title: product.title,
        seller: seller.displayName,
        category: phonesCategory.slug,
        price: 449900
      },
      syncedAt: new Date()
    },
    create: {
      listingId: listing.id,
      documentId: `listing-${listing.id}`,
      payload: {
        title: product.title,
        seller: seller.displayName,
        category: phonesCategory.slug,
        price: 449900
      },
      syncedAt: new Date()
    }
  });

  await prisma.reindexJob.upsert({
    where: { id: "seed-stage1-reindex-job" },
    update: {
      requestedByUserId: admin.id,
      scope: "catalog",
      status: JobStatus.SUCCEEDED,
      startedAt: new Date(),
      finishedAt: new Date()
    },
    create: {
      id: "seed-stage1-reindex-job",
      requestedByUserId: admin.id,
      scope: "catalog",
      status: JobStatus.SUCCEEDED,
      startedAt: new Date(),
      finishedAt: new Date()
    }
  });

  await prisma.searchSyncLog.upsert({
    where: { id: "seed-stage1-search-sync-log" },
    update: {
      listingId: listing.id,
      documentId: `listing-${listing.id}`,
      status: SearchSyncStatus.INDEXED,
      message: "Initial Stage 1 search projection complete."
    },
    create: {
      id: "seed-stage1-search-sync-log",
      listingId: listing.id,
      documentId: `listing-${listing.id}`,
      status: SearchSyncStatus.INDEXED,
      message: "Initial Stage 1 search projection complete."
    }
  });

  await prisma.auditLog.upsert({
    where: { id: "seed-stage1-audit-log" },
    update: {
      actorUserId: admin.id,
      entityType: "ORDER",
      entityId: order.id,
      action: "SEED_BOOTSTRAP",
      details: { stage: 1 }
    },
    create: {
      id: "seed-stage1-audit-log",
      actorUserId: admin.id,
      entityType: "ORDER",
      entityId: order.id,
      action: "SEED_BOOTSTRAP",
      details: { stage: 1 }
    }
  });

  await prisma.jobRun.upsert({
    where: { id: "seed-stage1-job-run" },
    update: {
      jobType: "seed-bootstrap",
      status: JobStatus.SUCCEEDED,
      payload: { stage: 1 },
      finishedAt: new Date()
    },
    create: {
      id: "seed-stage1-job-run",
      jobType: "seed-bootstrap",
      status: JobStatus.SUCCEEDED,
      payload: { stage: 1 },
      finishedAt: new Date()
    }
  });

  await prisma.webhookDeliveryRecord.upsert({
    where: {
      provider_externalEventId: {
        provider: "stripe",
        externalEventId: "evt_stage1_payment_succeeded"
      }
    },
    update: {
      signature: "whsec_stage1_demo",
      payload: { id: "evt_stage1_payment_succeeded" },
      status: WebhookDeliveryStatus.PROCESSED,
      processedAt: new Date()
    },
    create: {
      provider: "stripe",
      externalEventId: "evt_stage1_payment_succeeded",
      signature: "whsec_stage1_demo",
      payload: { id: "evt_stage1_payment_succeeded" },
      status: WebhookDeliveryStatus.PROCESSED,
      processedAt: new Date()
    }
  });
}

async function seedExpandedCatalog(): Promise<void> {
  const sellerOwner = await prisma.user.findUniqueOrThrow({
    where: { email: "seller@velora.local" }
  });
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@velora.local" }
  });

  const sellerDefinitions = [
    {
      slug: "north-star-electronics",
      displayName: "North Star Electronics",
      legalName: "North Star Electronics SRL",
      contactEmail: "seller@velora.local",
      ownerUserId: sellerOwner.id
    },
    {
      slug: "metro-digital",
      displayName: "Metro Digital",
      legalName: "Metro Digital Trade SRL",
      contactEmail: "ops@metro-digital.local",
      ownerUserId: null
    },
    {
      slug: "atlas-home-living",
      displayName: "Atlas Home Living",
      legalName: "Atlas Home Living SRL",
      contactEmail: "ops@atlas-home.local",
      ownerUserId: null
    },
    {
      slug: "peak-performance-outdoors",
      displayName: "Peak Performance Outdoors",
      legalName: "Peak Performance Outdoors SRL",
      contactEmail: "ops@peak-performance.local",
      ownerUserId: null
    }
  ] as const;
  const sellers = new Map<string, Awaited<ReturnType<typeof prisma.seller.upsert>>>();

  for (const definition of sellerDefinitions) {
    const seller = await prisma.seller.upsert({
      where: { slug: definition.slug },
      update: {
        displayName: definition.displayName,
        legalName: definition.legalName,
        contactEmail: definition.contactEmail,
        ownerUserId: definition.ownerUserId,
        status: SellerStatus.ACTIVE
      },
      create: {
        slug: definition.slug,
        displayName: definition.displayName,
        legalName: definition.legalName,
        contactEmail: definition.contactEmail,
        ownerUserId: definition.ownerUserId,
        status: SellerStatus.ACTIVE
      }
    });

    sellers.set(definition.slug, seller);
  }

  const categoryDefinitions = [
    {
      slug: "electronics",
      name: "Electronics",
      description: "Consumer electronics and connected devices.",
      parentSlug: null,
      sortOrder: 1
    },
    {
      slug: "home-living",
      name: "Home Living",
      description: "Appliances and practical upgrades for everyday living.",
      parentSlug: null,
      sortOrder: 2
    },
    {
      slug: "sports-outdoors",
      name: "Sports & Outdoors",
      description: "Training equipment and performance gear for active routines.",
      parentSlug: null,
      sortOrder: 3
    },
    {
      slug: "phones",
      name: "Phones",
      description: "Smartphones and companion devices.",
      parentSlug: "electronics",
      sortOrder: 1
    },
    {
      slug: "laptops",
      name: "Laptops",
      description: "Portable systems for work, creation, and study.",
      parentSlug: "electronics",
      sortOrder: 2
    },
    {
      slug: "tv-audio",
      name: "TV & Audio",
      description: "Home cinema displays, sound systems, and streaming gear.",
      parentSlug: "electronics",
      sortOrder: 3
    },
    {
      slug: "kitchen-appliances",
      name: "Kitchen Appliances",
      description: "Compact appliances tuned for fast daily use.",
      parentSlug: "home-living",
      sortOrder: 1
    },
    {
      slug: "cleaning",
      name: "Cleaning",
      description: "Cleaning hardware for apartments, homes, and mixed surfaces.",
      parentSlug: "home-living",
      sortOrder: 2
    },
    {
      slug: "fitness-equipment",
      name: "Fitness Equipment",
      description: "Strength and cardio products for serious home training.",
      parentSlug: "sports-outdoors",
      sortOrder: 1
    }
  ] as const;
  const categories = new Map<
    string,
    Awaited<ReturnType<typeof prisma.category.upsert>>
  >();

  for (const definition of categoryDefinitions.filter(
    (category) => category.parentSlug === null
  )) {
    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        parentId: null,
        sortOrder: definition.sortOrder
      },
      create: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        sortOrder: definition.sortOrder
      }
    });

    categories.set(definition.slug, category);
  }

  for (const definition of categoryDefinitions.filter(
    (category) => category.parentSlug !== null
  )) {
    const parent = categories.get(definition.parentSlug ?? "");

    if (!parent) {
      throw new Error(`Missing parent category for ${definition.slug}.`);
    }

    const category = await prisma.category.upsert({
      where: { slug: definition.slug },
      update: {
        name: definition.name,
        description: definition.description,
        parentId: parent.id,
        sortOrder: definition.sortOrder
      },
      create: {
        slug: definition.slug,
        name: definition.name,
        description: definition.description,
        parentId: parent.id,
        sortOrder: definition.sortOrder
      }
    });

    categories.set(definition.slug, category);
  }

  const brandDefinitions = [
    ["astra-mobile", "Astra Mobile"],
    ["nordwave", "NordWave"],
    ["helio", "Helio"],
    ["vanta", "Vanta"],
    ["lumahome", "LumaHome"],
    ["atlas", "Atlas"],
    ["forgefit", "ForgeFit"]
  ] as const;
  const brands = new Map<string, Awaited<ReturnType<typeof prisma.brand.upsert>>>();

  for (const [slug, name] of brandDefinitions) {
    const brand = await prisma.brand.upsert({
      where: { slug },
      update: { name },
      create: { slug, name }
    });

    brands.set(slug, brand);
  }

  const productBlueprints: SeedProductBlueprint[] = [
    {
      slug: "nordwave-edge-s",
      title: "NordWave Edge S",
      description: "Balanced flagship phone with fast charging and reliable dual-camera capture.",
      categorySlug: "phones",
      brandSlug: "nordwave",
      sellerSlug: "north-star-electronics",
      price: 329900,
      compareAtPrice: 359900,
      stock: 22,
      leadTimeDays: 1,
      variantTitle: "Azure 128 GB",
      variantAttributes: { color: "Azure", storage: "128 GB" },
      attributes: [
        ["Display", "6.1 inch OLED"],
        ["Camera", "50 MP dual camera"],
        ["Battery", "4700 mAh"]
      ],
      specifications: [
        ["Performance", "Chipset", "Nord N8"],
        ["Display", "Refresh rate", "120 Hz"],
        ["Connectivity", "Wireless", "5G, Wi-Fi 7"]
      ],
      secondaryOffer: {
        sellerSlug: "metro-digital",
        price: 324900,
        compareAtPrice: 349900,
        stock: 11,
        leadTimeDays: 1
      }
    },
    {
      slug: "helio-nova-air",
      title: "Helio Nova Air",
      description: "Slim 5G device tuned for daily productivity and strong endurance.",
      categorySlug: "phones",
      brandSlug: "helio",
      sellerSlug: "metro-digital",
      price: 279900,
      compareAtPrice: 309900,
      stock: 18,
      leadTimeDays: 1,
      variantTitle: "Silver 256 GB",
      variantAttributes: { color: "Silver", storage: "256 GB" },
      attributes: [
        ["Display", "6.5 inch AMOLED"],
        ["Charging", "66 W wired"],
        ["Ingress protection", "IP68"]
      ],
      specifications: [
        ["Performance", "Chipset", "Helio Core X6"],
        ["Camera", "Main sensor", "64 MP"],
        ["Battery", "Capacity", "5000 mAh"]
      ]
    },
    {
      slug: "vanta-probook-14",
      title: "Vanta ProBook 14",
      description: "Portable 14 inch laptop for mixed office, study, and light creative work.",
      categorySlug: "laptops",
      brandSlug: "vanta",
      sellerSlug: "north-star-electronics",
      price: 459900,
      compareAtPrice: 499900,
      stock: 13,
      leadTimeDays: 2,
      variantTitle: "Graphite / 16 GB / 512 GB",
      variantAttributes: {
        finish: "Graphite",
        memory: "16 GB",
        storage: "512 GB SSD"
      },
      attributes: [
        ["Display", "14 inch IPS"],
        ["Processor", "Vanta Ryzen V7"],
        ["Battery", "70 Wh"]
      ],
      specifications: [
        ["Performance", "Graphics", "Radeon 780M"],
        ["Ports", "Connectivity", "USB-C, HDMI 2.1, Wi-Fi 6E"],
        ["Mobility", "Weight", "1.42 kg"]
      ]
    },
    {
      slug: "astra-flex-13",
      title: "Astra Flex 13",
      description: "Convertible ultrabook with pen support for mixed productivity and note taking.",
      categorySlug: "laptops",
      brandSlug: "astra-mobile",
      sellerSlug: "north-star-electronics",
      price: 389900,
      compareAtPrice: 419900,
      stock: 12,
      leadTimeDays: 2,
      variantTitle: "Pearl / 16 GB / 512 GB",
      variantAttributes: {
        finish: "Pearl",
        memory: "16 GB",
        storage: "512 GB SSD"
      },
      attributes: [
        ["Display", "13.3 inch touch OLED"],
        ["Form factor", "360 degree hinge"],
        ["Accessory", "Active pen"]
      ],
      specifications: [
        ["Performance", "Processor", "Astra Core U7"],
        ["Mobility", "Weight", "1.29 kg"],
        ["Battery", "Runtime", "Up to 13 hours"]
      ]
    },
    {
      slug: "helio-cinema-55",
      title: "Helio Cinema 55",
      description: "55 inch 4K smart TV with balanced motion handling and strong contrast.",
      categorySlug: "tv-audio",
      brandSlug: "helio",
      sellerSlug: "metro-digital",
      price: 289900,
      compareAtPrice: 329900,
      stock: 16,
      leadTimeDays: 2,
      variantTitle: "55 inch",
      variantAttributes: { size: "55 inch", panel: "QLED" },
      attributes: [
        ["Resolution", "3840 x 2160"],
        ["HDR", "HDR10+"],
        ["Operating system", "Helio TV OS"]
      ],
      specifications: [
        ["Display", "Refresh rate", "120 Hz"],
        ["Audio", "Speaker output", "40 W"],
        ["Connectivity", "Ports", "4x HDMI, 2x USB"]
      ]
    },
    {
      slug: "lumahome-soundbar-max",
      title: "LumaHome Soundbar Max",
      description: "Compact Dolby Atmos soundbar package designed for apartment-friendly living rooms.",
      categorySlug: "tv-audio",
      brandSlug: "lumahome",
      sellerSlug: "north-star-electronics",
      price: 109900,
      compareAtPrice: 129900,
      stock: 25,
      leadTimeDays: 1,
      variantTitle: "3.1 channel",
      variantAttributes: { channels: "3.1", finish: "Charcoal" },
      attributes: [
        ["Audio format", "Dolby Atmos"],
        ["Wireless", "Bluetooth 5.3"],
        ["Subwoofer", "Wireless"]
      ],
      specifications: [
        ["Audio", "Power", "360 W"],
        ["Connectivity", "Inputs", "HDMI eARC, Optical"],
        ["Placement", "Width", "98 cm"]
      ]
    },
    {
      slug: "lumahome-brew-station",
      title: "LumaHome Brew Station",
      description: "Automatic coffee station with reliable morning presets and quick cleanup.",
      categorySlug: "kitchen-appliances",
      brandSlug: "lumahome",
      sellerSlug: "atlas-home-living",
      price: 79900,
      compareAtPrice: 94900,
      stock: 20,
      leadTimeDays: 2,
      variantTitle: "Black / 1.6 L",
      variantAttributes: { finish: "Black", capacity: "1.6 L" },
      attributes: [
        ["Pressure", "19 bar"],
        ["Milk system", "Integrated"],
        ["Control panel", "Touch display"]
      ],
      specifications: [
        ["Capacity", "Water tank", "1.6 L"],
        ["Power", "Output", "1450 W"],
        ["Cleaning", "Program", "Automatic rinse cycle"]
      ]
    },
    {
      slug: "atlas-air-fry-pro",
      title: "Atlas Air Fry Pro",
      description: "Mid-capacity air fryer with preset programs for weekday cooking speed.",
      categorySlug: "kitchen-appliances",
      brandSlug: "atlas",
      sellerSlug: "atlas-home-living",
      price: 59900,
      compareAtPrice: 69900,
      stock: 27,
      leadTimeDays: 2,
      variantTitle: "Graphite / 6.5 L",
      variantAttributes: { finish: "Graphite", capacity: "6.5 L" },
      attributes: [
        ["Cooking modes", "8 presets"],
        ["Basket", "Dishwasher safe"],
        ["Control panel", "Digital"]
      ],
      specifications: [
        ["Capacity", "Basket volume", "6.5 L"],
        ["Power", "Output", "1700 W"],
        ["Safety", "Auto shutoff", "Yes"]
      ]
    },
    {
      slug: "lumahome-cleanjet-s8",
      title: "LumaHome CleanJet S8",
      description: "Cordless stick vacuum designed for apartment layouts and quick daily cleaning.",
      categorySlug: "cleaning",
      brandSlug: "lumahome",
      sellerSlug: "atlas-home-living",
      price: 69900,
      compareAtPrice: 84900,
      stock: 19,
      leadTimeDays: 2,
      variantTitle: "Champagne / 0.6 L",
      variantAttributes: { finish: "Champagne", bin: "0.6 L" },
      attributes: [
        ["Runtime", "55 minutes"],
        ["Filters", "HEPA"],
        ["Accessories", "Crevice tool and mini brush"]
      ],
      specifications: [
        ["Power", "Battery", "25.2 V"],
        ["Maintenance", "Dust bin", "0.6 L"],
        ["Weight", "Body", "2.5 kg"]
      ]
    },
    {
      slug: "atlas-vacuum-duo",
      title: "Atlas Vacuum Duo",
      description: "Bagless canister vacuum with strong suction for carpets and hard floors.",
      categorySlug: "cleaning",
      brandSlug: "atlas",
      sellerSlug: "atlas-home-living",
      price: 49900,
      compareAtPrice: 57900,
      stock: 23,
      leadTimeDays: 2,
      variantTitle: "Blue / 2.5 L",
      variantAttributes: { finish: "Blue", bin: "2.5 L" },
      attributes: [
        ["Filtration", "Cyclonic"],
        ["Cable length", "7 m"],
        ["Noise", "74 dB"]
      ],
      specifications: [
        ["Power", "Motor", "900 W"],
        ["Maintenance", "Dust container", "2.5 L"],
        ["Reach", "Operating radius", "10 m"]
      ]
    },
    {
      slug: "forgefit-sprint-t7",
      title: "ForgeFit Sprint T7",
      description: "Performance treadmill with incline presets and stable deck cushioning.",
      categorySlug: "fitness-equipment",
      brandSlug: "forgefit",
      sellerSlug: "peak-performance-outdoors",
      price: 319900,
      compareAtPrice: 349900,
      stock: 6,
      leadTimeDays: 3,
      variantTitle: "Black / Foldable",
      variantAttributes: { finish: "Black", frame: "Foldable" },
      attributes: [
        ["Speed", "Up to 20 km/h"],
        ["Incline", "15 levels"],
        ["Motor", "3.5 HP"]
      ],
      specifications: [
        ["Frame", "Running surface", "150 x 52 cm"],
        ["Capacity", "User weight", "140 kg"],
        ["Console", "Programs", "18 workout modes"]
      ]
    },
    {
      slug: "helio-spin-bike-core",
      title: "Helio Spin Bike Core",
      description: "Indoor cycling bike with magnetic resistance and tablet-friendly cockpit layout.",
      categorySlug: "fitness-equipment",
      brandSlug: "helio",
      sellerSlug: "peak-performance-outdoors",
      price: 159900,
      compareAtPrice: 179900,
      stock: 10,
      leadTimeDays: 3,
      variantTitle: "Matte black",
      variantAttributes: { finish: "Matte black", drive: "Belt drive" },
      attributes: [
        ["Resistance", "Magnetic"],
        ["Flywheel", "18 kg"],
        ["Console", "LCD metrics display"]
      ],
      specifications: [
        ["Frame", "User weight", "130 kg"],
        ["Adjustability", "Seat and handlebar", "4-way"],
        ["Footprint", "Dimensions", "116 x 56 cm"]
      ]
    }
  ];

  for (const [index, blueprint] of productBlueprints.entries()) {
    const category = categories.get(blueprint.categorySlug);
    const brand = brands.get(blueprint.brandSlug);
    const seller = sellers.get(blueprint.sellerSlug);

    if (!category || !brand || !seller) {
      throw new Error(`Missing seed dependency for ${blueprint.slug}.`);
    }

    const product = await prisma.product.upsert({
      where: { slug: blueprint.slug },
      update: {
        title: blueprint.title,
        description: blueprint.description,
        status: ProductStatus.ACTIVE,
        brandId: brand.id,
        categoryId: category.id
      },
      create: {
        slug: blueprint.slug,
        title: blueprint.title,
        description: blueprint.description,
        status: ProductStatus.ACTIVE,
        brandId: brand.id,
        categoryId: category.id
      }
    });
    const variant = await prisma.productVariant.upsert({
      where: {
        sku: `VEL-${String(index + 2).padStart(6, "0")}`
      },
      update: {
        productId: product.id,
        title: blueprint.variantTitle,
        attributes: blueprint.variantAttributes,
        isDefault: true
      },
      create: {
        sku: `VEL-${String(index + 2).padStart(6, "0")}`,
        productId: product.id,
        title: blueprint.variantTitle,
        attributes: blueprint.variantAttributes,
        isDefault: true
      }
    });

    await prisma.productMedia.upsert({
      where: { id: `seed-stage3-media-${blueprint.slug}` },
      update: {
        productId: product.id,
        storageKey: `catalog/${blueprint.slug}/hero.png`,
        url: `https://placehold.co/800x800/png?text=${encodeURIComponent(blueprint.title)}`,
        altText: `${blueprint.title} hero image`,
        sortOrder: 1
      },
      create: {
        id: `seed-stage3-media-${blueprint.slug}`,
        productId: product.id,
        storageKey: `catalog/${blueprint.slug}/hero.png`,
        url: `https://placehold.co/800x800/png?text=${encodeURIComponent(blueprint.title)}`,
        altText: `${blueprint.title} hero image`,
        sortOrder: 1
      }
    });

    for (const [attributeIndex, [name, value]] of blueprint.attributes.entries()) {
      await prisma.productAttribute.upsert({
        where: { id: `seed-stage3-attribute-${blueprint.slug}-${attributeIndex + 1}` },
        update: {
          productId: product.id,
          name,
          value
        },
        create: {
          id: `seed-stage3-attribute-${blueprint.slug}-${attributeIndex + 1}`,
          productId: product.id,
          name,
          value
        }
      });
    }

    for (const [specificationIndex, [groupName, label, value]] of blueprint.specifications.entries()) {
      await prisma.productSpecification.upsert({
        where: {
          id: `seed-stage3-specification-${blueprint.slug}-${specificationIndex + 1}`
        },
        update: {
          productId: product.id,
          groupName,
          label,
          value
        },
        create: {
          id: `seed-stage3-specification-${blueprint.slug}-${specificationIndex + 1}`,
          productId: product.id,
          groupName,
          label,
          value
        }
      });
    }

    const listing = await prisma.sellerProductListing.upsert({
      where: {
        sellerSku: `seed-${blueprint.sellerSlug}-${blueprint.slug}`
      },
      update: {
        sellerId: seller.id,
        productId: product.id,
        variantId: variant.id,
        status: ProductStatus.ACTIVE,
        isActive: true,
        leadTimeDays: blueprint.leadTimeDays
      },
      create: {
        sellerId: seller.id,
        productId: product.id,
        variantId: variant.id,
        sellerSku: `seed-${blueprint.sellerSlug}-${blueprint.slug}`,
        status: ProductStatus.ACTIVE,
        isActive: true,
        leadTimeDays: blueprint.leadTimeDays
      }
    });

    await prisma.price.upsert({
      where: { id: `seed-stage3-price-${blueprint.slug}-1` },
      update: {
        listingId: listing.id,
        amount: blueprint.price,
        currency: "RON",
        compareAtAmount: blueprint.compareAtPrice
      },
      create: {
        id: `seed-stage3-price-${blueprint.slug}-1`,
        listingId: listing.id,
        amount: blueprint.price,
        currency: "RON",
        compareAtAmount: blueprint.compareAtPrice
      }
    });

    await prisma.inventoryItem.upsert({
      where: { listingId: listing.id },
      update: {
        onHand: blueprint.stock,
        reserved: 0,
        safetyStock: blueprint.stock <= 10 ? 1 : 2
      },
      create: {
        listingId: listing.id,
        onHand: blueprint.stock,
        reserved: 0,
        safetyStock: blueprint.stock <= 10 ? 1 : 2
      }
    });

    if (blueprint.secondaryOffer) {
      const secondarySeller = sellers.get(blueprint.secondaryOffer.sellerSlug);

      if (!secondarySeller) {
        throw new Error(`Missing secondary seller for ${blueprint.slug}.`);
      }

      const secondaryListing = await prisma.sellerProductListing.upsert({
        where: {
          sellerSku: `seed-${blueprint.secondaryOffer.sellerSlug}-${blueprint.slug}`
        },
        update: {
          sellerId: secondarySeller.id,
          productId: product.id,
          variantId: variant.id,
          status: ProductStatus.ACTIVE,
          isActive: true,
          leadTimeDays: blueprint.secondaryOffer.leadTimeDays
        },
        create: {
          sellerId: secondarySeller.id,
          productId: product.id,
          variantId: variant.id,
          sellerSku: `seed-${blueprint.secondaryOffer.sellerSlug}-${blueprint.slug}`,
          status: ProductStatus.ACTIVE,
          isActive: true,
          leadTimeDays: blueprint.secondaryOffer.leadTimeDays
        }
      });

      await prisma.price.upsert({
        where: { id: `seed-stage3-price-${blueprint.slug}-2` },
        update: {
          listingId: secondaryListing.id,
          amount: blueprint.secondaryOffer.price,
          currency: "RON",
          compareAtAmount: blueprint.secondaryOffer.compareAtPrice
        },
        create: {
          id: `seed-stage3-price-${blueprint.slug}-2`,
          listingId: secondaryListing.id,
          amount: blueprint.secondaryOffer.price,
          currency: "RON",
          compareAtAmount: blueprint.secondaryOffer.compareAtPrice
        }
      });

      await prisma.inventoryItem.upsert({
        where: { listingId: secondaryListing.id },
        update: {
          onHand: blueprint.secondaryOffer.stock,
          reserved: 0,
          safetyStock: 1
        },
        create: {
          listingId: secondaryListing.id,
          onHand: blueprint.secondaryOffer.stock,
          reserved: 0,
          safetyStock: 1
        }
      });
    }
  }

  const metroDigital = sellers.get("metro-digital");
  const astraProduct = await prisma.product.findUniqueOrThrow({
    where: { slug: "astra-x1-pro" }
  });
  const astraVariant = await prisma.productVariant.findUniqueOrThrow({
    where: { sku: "VEL-000001" }
  });

  if (!metroDigital) {
    throw new Error("Missing Metro Digital seller.");
  }

  const astraSecondaryListing = await prisma.sellerProductListing.upsert({
    where: { sellerSku: "seed-metro-digital-astra-x1-pro" },
    update: {
      sellerId: metroDigital.id,
      productId: astraProduct.id,
      variantId: astraVariant.id,
      status: ProductStatus.ACTIVE,
      isActive: true,
      leadTimeDays: 1
    },
    create: {
      sellerId: metroDigital.id,
      productId: astraProduct.id,
      variantId: astraVariant.id,
      sellerSku: "seed-metro-digital-astra-x1-pro",
      status: ProductStatus.ACTIVE,
      isActive: true,
      leadTimeDays: 1
    }
  });

  await prisma.price.upsert({
    where: { id: "seed-stage3-price-astra-x1-pro-2" },
    update: {
      listingId: astraSecondaryListing.id,
      amount: 444900,
      currency: "RON",
      compareAtAmount: 474900
    },
    create: {
      id: "seed-stage3-price-astra-x1-pro-2",
      listingId: astraSecondaryListing.id,
      amount: 444900,
      currency: "RON",
      compareAtAmount: 474900
    }
  });

  await prisma.inventoryItem.upsert({
    where: { listingId: astraSecondaryListing.id },
    update: {
      onHand: 8,
      reserved: 0,
      safetyStock: 1
    },
    create: {
      listingId: astraSecondaryListing.id,
      onHand: 8,
      reserved: 0,
      safetyStock: 1
    }
  });

  const listingsForSearch = await prisma.sellerProductListing.findMany({
    where: {
      isActive: true,
      status: ProductStatus.ACTIVE,
      product: {
        status: ProductStatus.ACTIVE
      }
    },
    include: searchProjectionListingInclude.include
  });

  for (const listing of listingsForSearch) {
    const document = buildSearchDocument(listing);

    await prisma.searchDocument.upsert({
      where: { listingId: listing.id },
      update: {
        documentId: `listing-${listing.id}`,
        payload: document as unknown as Prisma.InputJsonValue,
        syncedAt: new Date()
      },
      create: {
        listingId: listing.id,
        documentId: `listing-${listing.id}`,
        payload: document as unknown as Prisma.InputJsonValue,
        syncedAt: new Date()
      }
    });

    await prisma.searchSyncLog.upsert({
      where: { id: `seed-stage3-search-sync-${listing.sellerSku}` },
      update: {
        listingId: listing.id,
        documentId: `listing-${listing.id}`,
        status: SearchSyncStatus.INDEXED,
        message: "Stage 3 search projection seeded."
      },
      create: {
        id: `seed-stage3-search-sync-${listing.sellerSku}`,
        listingId: listing.id,
        documentId: `listing-${listing.id}`,
        status: SearchSyncStatus.INDEXED,
        message: "Stage 3 search projection seeded."
      }
    });
  }

  await prisma.reindexJob.upsert({
    where: { id: "seed-stage3-reindex-job" },
    update: {
      requestedByUserId: admin.id,
      scope: "catalog-search-stage-3",
      status: JobStatus.SUCCEEDED,
      startedAt: new Date(),
      finishedAt: new Date()
    },
    create: {
      id: "seed-stage3-reindex-job",
      requestedByUserId: admin.id,
      scope: "catalog-search-stage-3",
      status: JobStatus.SUCCEEDED,
      startedAt: new Date(),
      finishedAt: new Date()
    }
  });
}

async function seedSellerOnboarding(): Promise<void> {
  await prisma.sellerApplication.upsert({
    where: {
      id: "seed-seller-application-pending"
    },
    update: {
      displayName: "Peak Trail Outdoor Gear",
      legalName: "Peak Trail Outdoor Gear SRL",
      contactFirstName: "Andrei",
      contactLastName: "Marin",
      contactEmail: "merchant.onboarding@velora.local",
      contactPhone: "+40 722 333 444",
      websiteUrl: "https://peaktrail.example",
      catalogSummary:
        "Premium running accessories, recovery gear, hydration products, and compact training electronics for urban fitness buyers.",
      notes:
        "Already shipping nationwide with same-day handoff in Bucharest.",
      status: SellerApplicationStatus.SUBMITTED,
      reviewedByUserId: null,
      reviewedAt: null,
      reviewNote: null,
      sellerId: null,
      activationExpiresAt: null,
      activatedAt: null
    },
    create: {
      id: "seed-seller-application-pending",
      displayName: "Peak Trail Outdoor Gear",
      legalName: "Peak Trail Outdoor Gear SRL",
      contactFirstName: "Andrei",
      contactLastName: "Marin",
      contactEmail: "merchant.onboarding@velora.local",
      contactPhone: "+40 722 333 444",
      websiteUrl: "https://peaktrail.example",
      catalogSummary:
        "Premium running accessories, recovery gear, hydration products, and compact training electronics for urban fitness buyers.",
      notes:
        "Already shipping nationwide with same-day handoff in Bucharest.",
      status: SellerApplicationStatus.SUBMITTED
    }
  });
}

async function seedNotifications(): Promise<void> {
  const admin = await prisma.user.findUniqueOrThrow({
    where: { email: "admin@velora.local" }
  });
  const seller = await prisma.user.findUniqueOrThrow({
    where: { email: "seller@velora.local" }
  });
  const customer = await prisma.user.findUniqueOrThrow({
    where: { email: "customer@velora.local" }
  });

  const notifications = [
    {
      id: "seed-notification-admin-onboarding",
      userId: admin.id,
      kind: NotificationKind.SELLER_APPLICATION,
      level: NotificationLevel.ACTION_REQUIRED,
      title: "New seller application",
      message:
        "Peak Trail Outdoor Gear submitted a merchant onboarding request and is waiting for review.",
      linkUrl: "http://localhost:3001#seller-applications"
    },
    {
      id: "seed-notification-admin-operations",
      userId: admin.id,
      kind: NotificationKind.OPERATIONS,
      level: NotificationLevel.INFO,
      title: "Reservation cleanup remains available",
      message:
        "Operational controls can still release expired reservations and reindex catalog projections from the backoffice.",
      linkUrl: "http://localhost:3001#operations",
      readAt: new Date()
    },
    {
      id: "seed-notification-seller-order",
      userId: seller.id,
      kind: NotificationKind.ORDER,
      level: NotificationLevel.SUCCESS,
      title: "New seller order ready",
      message:
        "A seeded paid order is available in the seller workspace for operational follow-up.",
      linkUrl: "/seller/orders"
    },
    {
      id: "seed-notification-seller-account",
      userId: seller.id,
      kind: NotificationKind.ACCOUNT,
      level: NotificationLevel.INFO,
      title: "Seller workspace active",
      message:
        "Your demo seller account can manage listings, stock posture, and marketplace order visibility.",
      linkUrl: "/seller",
      readAt: new Date()
    },
    {
      id: "seed-notification-customer-order",
      userId: customer.id,
      kind: NotificationKind.ORDER,
      level: NotificationLevel.SUCCESS,
      title: "Recent order paid",
      message:
        "Your seeded paid order is available in the account order history with payment and refund details.",
      linkUrl: "/account/orders"
    },
    {
      id: "seed-notification-customer-account",
      userId: customer.id,
      kind: NotificationKind.ACCOUNT,
      level: NotificationLevel.INFO,
      title: "Account ready",
      message:
        "Your customer account can manage addresses, checkout sessions, and order tracking from one place.",
      linkUrl: "/account",
      readAt: new Date()
    }
  ];

  for (const notification of notifications) {
    await prisma.notification.upsert({
      where: {
        id: notification.id
      },
      update: {
        userId: notification.userId,
        kind: notification.kind,
        level: notification.level,
        title: notification.title,
        message: notification.message,
        linkUrl: notification.linkUrl,
        readAt: notification.readAt ?? null
      },
      create: {
        id: notification.id,
        userId: notification.userId,
        kind: notification.kind,
        level: notification.level,
        title: notification.title,
        message: notification.message,
        linkUrl: notification.linkUrl,
        readAt: notification.readAt ?? null
      }
    });
  }
}

async function main(): Promise<void> {
  await seedRoles();
  await seedUsers();
  await seedCatalogAndCommerce();
  await seedExpandedCatalog();
  await seedSellerOnboarding();
  await seedNotifications();
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
