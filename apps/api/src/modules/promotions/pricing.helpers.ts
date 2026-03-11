import { appliedDiscountSummarySchema } from "@velora/contracts";
import { z } from "zod";

export const pricingSnapshotSchema = z.object({
  subtotal: z.number().int().nonnegative(),
  discountTotal: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
  currency: z.string().length(3),
  couponCode: z.string().nullable(),
  discounts: z.array(appliedDiscountSummarySchema)
});

export type PricingSnapshot = z.infer<typeof pricingSnapshotSchema>;
