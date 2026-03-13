import { PrismaClient } from "@prisma/client";

import { createPrismaAdapter } from "../modules/database/prisma-adapter";

const prisma = new PrismaClient({
  adapter: createPrismaAdapter()
});

type ExplainRow = {
  "QUERY PLAN": string;
};

async function explain(label: string, query: string, params: string[]) {
  const plan = await prisma.$queryRawUnsafe<ExplainRow[]>(query, ...params);

  console.log(`\n# ${label}`);

  for (const row of plan) {
    console.log(row["QUERY PLAN"]);
  }
}

async function main() {
  const [sampleListing, sampleCart, sampleCheckout] = await Promise.all([
    prisma.sellerProductListing.findFirst({
      where: {
        isActive: true,
        status: "ACTIVE"
      },
      select: {
        productId: true,
        sellerId: true
      }
    }),
    prisma.cart.findFirst({
      where: {
        userId: {
          not: null
        },
        status: "ACTIVE"
      },
      select: {
        userId: true
      }
    }),
    prisma.checkoutSession.findFirst({
      where: {
        status: {
          in: ["STARTED", "PAYMENT_PENDING", "COMPLETED", "FAILED", "EXPIRED"]
        }
      },
      select: {
        id: true
      }
    })
  ]);

  if (!sampleListing?.productId || !sampleListing.sellerId || !sampleCart?.userId) {
    throw new Error("Missing seeded data required for perf smoke review.");
  }

  await explain(
    "product detail offers",
    `EXPLAIN (FORMAT TEXT)
     SELECT "id"
     FROM "SellerProductListing"
     WHERE "productId" = $1 AND "isActive" = true AND "status" = 'ACTIVE'
     LIMIT 12`,
    [sampleListing.productId]
  );

  await explain(
    "active cart lookup",
    `EXPLAIN (FORMAT TEXT)
     SELECT "id"
     FROM "Cart"
     WHERE "userId" = $1 AND "status" = 'ACTIVE'
     LIMIT 1`,
    [sampleCart.userId]
  );

  if (sampleCheckout?.id) {
    await explain(
      "checkout reservation lookup",
      `EXPLAIN (FORMAT TEXT)
       SELECT "id"
       FROM "StockReservation"
       WHERE "checkoutSessionId" = $1 AND "status" = 'ACTIVE'`,
      [sampleCheckout.id]
    );
  }

  await explain(
    "seller order join",
    `EXPLAIN (FORMAT TEXT)
     SELECT oi."orderId"
     FROM "OrderItem" oi
     INNER JOIN "SellerProductListing" l ON l."id" = oi."listingId"
     WHERE l."sellerId" = $1
     LIMIT 20`,
    [sampleListing.sellerId]
  );

  await explain(
    "customer order history",
    `EXPLAIN (FORMAT TEXT)
     SELECT "id", "createdAt"
     FROM "Order"
     WHERE "userId" = $1
     ORDER BY "createdAt" DESC
     LIMIT 20`,
    [sampleCart.userId]
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
