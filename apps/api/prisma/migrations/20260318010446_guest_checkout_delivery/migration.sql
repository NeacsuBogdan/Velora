-- AlterTable
ALTER TABLE "Cart" ADD COLUMN     "guestTokenHash" TEXT;

-- AlterTable
ALTER TABLE "CheckoutSession" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "deliveryAddressSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "customerSnapshot" JSONB,
ADD COLUMN     "deliveryAddressSnapshot" JSONB;

-- CreateIndex
CREATE INDEX "Cart_guestTokenHash_status_idx" ON "Cart"("guestTokenHash", "status");
