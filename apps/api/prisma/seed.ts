import {
  PrismaClient,
  CartStatus,
  CheckoutStatus,
  CouponStatus,
  InventoryMovementType,
  InventoryReservationStatus,
  JobStatus,
  OrderStatus,
  PaymentStatus,
  ProductStatus,
  PromotionStackingMode,
  PromotionType,
  SearchSyncStatus,
  SellerStatus,
  UserRoleCode,
  WebhookDeliveryStatus
} from "@prisma/client";
import bcrypt from "bcryptjs";

import { createPrismaAdapter } from "../src/modules/database/prisma-adapter";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter()
});

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
      placedAt: new Date()
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
      placedAt: new Date()
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

  await prisma.orderStatusHistory.upsert({
    where: { id: "seed-stage1-order-history" },
    update: {
      orderId: order.id,
      actorUserId: admin.id,
      status: OrderStatus.PAID,
      note: "Bootstrap order settled for Stage 1."
    },
    create: {
      id: "seed-stage1-order-history",
      orderId: order.id,
      actorUserId: admin.id,
      status: OrderStatus.PAID,
      note: "Bootstrap order settled for Stage 1."
    }
  });

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

  const promotion = await prisma.promotion.upsert({
    where: { code: "WELCOME5" },
    update: {
      name: "Welcome 5%",
      description: "A simple Stage 1 pricing seed.",
      type: PromotionType.PERCENTAGE,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 10,
      isActive: true
    },
    create: {
      name: "Welcome 5%",
      code: "WELCOME5",
      description: "A simple Stage 1 pricing seed.",
      type: PromotionType.PERCENTAGE,
      stackingMode: PromotionStackingMode.STACKABLE,
      priority: 10,
      isActive: true
    }
  });

  await prisma.promotionRule.upsert({
    where: { id: "seed-stage1-promotion-rule" },
    update: {
      promotionId: promotion.id,
      name: "5 percent off order total",
      configuration: { percentage: 5 }
    },
    create: {
      id: "seed-stage1-promotion-rule",
      promotionId: promotion.id,
      name: "5 percent off order total",
      configuration: { percentage: 5 }
    }
  });

  await prisma.coupon.upsert({
    where: { code: "DEMO5" },
    update: {
      promotionId: promotion.id,
      status: CouponStatus.ACTIVE,
      usageLimit: 100
    },
    create: {
      promotionId: promotion.id,
      code: "DEMO5",
      status: CouponStatus.ACTIVE,
      usageLimit: 100
    }
  });

  await prisma.appliedDiscountSnapshot.upsert({
    where: { id: "seed-stage1-discount-snapshot" },
    update: {
      orderId: order.id,
      promotionId: promotion.id,
      couponCode: "DEMO5",
      label: "Welcome 5%",
      amount: 22500,
      metadata: { source: "bootstrap-seed" }
    },
    create: {
      id: "seed-stage1-discount-snapshot",
      orderId: order.id,
      promotionId: promotion.id,
      couponCode: "DEMO5",
      label: "Welcome 5%",
      amount: 22500,
      metadata: { source: "bootstrap-seed" }
    }
  });

  await prisma.searchDocument.upsert({
    where: { documentId: "listing-stage1-astra-x1-pro" },
    update: {
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
      documentId: "listing-stage1-astra-x1-pro",
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
      documentId: "listing-stage1-astra-x1-pro",
      status: SearchSyncStatus.INDEXED,
      message: "Initial Stage 1 search projection complete."
    },
    create: {
      id: "seed-stage1-search-sync-log",
      listingId: listing.id,
      documentId: "listing-stage1-astra-x1-pro",
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

async function main(): Promise<void> {
  await seedRoles();
  await seedUsers();
  await seedCatalogAndCommerce();
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
