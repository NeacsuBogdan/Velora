ALTER TABLE "Cart"
ADD COLUMN "couponCode" TEXT;

ALTER TABLE "CheckoutSession"
ADD COLUMN "pricingSnapshot" JSONB;
