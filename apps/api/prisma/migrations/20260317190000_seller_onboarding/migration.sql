-- CreateEnum
CREATE TYPE "SellerApplicationStatus" AS ENUM (
  'SUBMITTED',
  'REVIEWING',
  'ACTIVATION_PENDING',
  'ACTIVATED',
  'REJECTED'
);

-- CreateTable
CREATE TABLE "SellerApplication" (
  "id" TEXT NOT NULL,
  "displayName" TEXT NOT NULL,
  "legalName" TEXT NOT NULL,
  "contactFirstName" TEXT NOT NULL,
  "contactLastName" TEXT NOT NULL,
  "contactEmail" TEXT NOT NULL,
  "contactPhone" TEXT,
  "websiteUrl" TEXT,
  "catalogSummary" TEXT NOT NULL,
  "notes" TEXT,
  "status" "SellerApplicationStatus" NOT NULL DEFAULT 'SUBMITTED',
  "reviewedByUserId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewNote" TEXT,
  "sellerId" TEXT,
  "activationExpiresAt" TIMESTAMP(3),
  "activatedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "SellerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SellerActivationToken" (
  "id" TEXT NOT NULL,
  "sellerApplicationId" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "consumedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "SellerActivationToken_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SellerApplication_sellerId_key"
ON "SellerApplication"("sellerId");

-- CreateIndex
CREATE INDEX "SellerApplication_status_createdAt_idx"
ON "SellerApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "SellerApplication_contactEmail_idx"
ON "SellerApplication"("contactEmail");

-- CreateIndex
CREATE UNIQUE INDEX "SellerActivationToken_sellerApplicationId_key"
ON "SellerActivationToken"("sellerApplicationId");

-- CreateIndex
CREATE UNIQUE INDEX "SellerActivationToken_tokenHash_key"
ON "SellerActivationToken"("tokenHash");

-- CreateIndex
CREATE INDEX "SellerActivationToken_expiresAt_idx"
ON "SellerActivationToken"("expiresAt");

-- AddForeignKey
ALTER TABLE "SellerApplication"
ADD CONSTRAINT "SellerApplication_reviewedByUserId_fkey"
FOREIGN KEY ("reviewedByUserId") REFERENCES "User"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerApplication"
ADD CONSTRAINT "SellerApplication_sellerId_fkey"
FOREIGN KEY ("sellerId") REFERENCES "Seller"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SellerActivationToken"
ADD CONSTRAINT "SellerActivationToken_sellerApplicationId_fkey"
FOREIGN KEY ("sellerApplicationId") REFERENCES "SellerApplication"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
