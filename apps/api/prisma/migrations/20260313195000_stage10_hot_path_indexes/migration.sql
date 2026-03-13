-- CreateIndex
CREATE INDEX "SellerProductListing_productId_isActive_status_idx"
ON "SellerProductListing"("productId", "isActive", "status");

-- CreateIndex
CREATE INDEX "StockReservation_checkoutSessionId_status_idx"
ON "StockReservation"("checkoutSessionId", "status");

-- CreateIndex
CREATE INDEX "Order_userId_createdAt_idx"
ON "Order"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "OrderItem_listingId_orderId_idx"
ON "OrderItem"("listingId", "orderId");
