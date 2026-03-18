-- CreateEnum
CREATE TYPE "PromotionFundingSource" AS ENUM ('PLATFORM', 'SELLER', 'SHARED');

-- AlterTable
ALTER TABLE "AppliedDiscountSnapshot" ADD COLUMN     "fundingSource" "PromotionFundingSource" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN     "platformFundedAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerFundedAmount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "settlementSnapshot" JSONB;

-- AlterTable
ALTER TABLE "Promotion" ADD COLUMN     "fundingSource" "PromotionFundingSource" NOT NULL DEFAULT 'PLATFORM',
ADD COLUMN     "sellerFundingSharePercent" INTEGER;
