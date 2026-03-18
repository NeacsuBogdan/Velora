-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN "ownerSellerId" TEXT;

-- CreateIndex
CREATE INDEX "Promotion_ownerSellerId_updatedAt_idx" ON "Promotion"("ownerSellerId", "updatedAt");

-- AddForeignKey
ALTER TABLE "Promotion"
ADD CONSTRAINT "Promotion_ownerSellerId_fkey"
FOREIGN KEY ("ownerSellerId") REFERENCES "Seller"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
