import { appliedDiscountSummarySchema, orderSettlementSummarySchema } from "@velora/contracts";
import { z } from "zod";

export const pricingDiscountAllocationSchema = z.object({
  listingId: z.string(),
  amount: z.number().int().nonnegative()
});

export const pricingDiscountSnapshotSchema = appliedDiscountSummarySchema.extend({
  allocations: z.array(pricingDiscountAllocationSchema)
});

export const pricingSnapshotSchema = z.object({
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currency: z.string().length(3),
  couponCode: z.string().nullable(),
  discounts: z.array(pricingDiscountSnapshotSchema)
});

export type PricingSnapshot = z.infer<typeof pricingSnapshotSchema>;

export const orderSettlementSnapshotSchema = orderSettlementSummarySchema;

export type OrderSettlementSnapshot = z.infer<typeof orderSettlementSnapshotSchema>;
