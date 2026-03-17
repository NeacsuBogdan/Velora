ALTER TABLE "Product"
ADD COLUMN "ownerSellerId" TEXT;

CREATE INDEX "Product_ownerSellerId_idx" ON "Product"("ownerSellerId");

ALTER TABLE "Product"
ADD CONSTRAINT "Product_ownerSellerId_fkey"
FOREIGN KEY ("ownerSellerId") REFERENCES "Seller"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
