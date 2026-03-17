import { z } from "zod";

export const sellerApplicationFormSchema = z.object({
  displayName: z.string().trim().min(3).max(120),
  legalName: z.string().trim().min(3).max(160),
  contactFirstName: z.string().trim().min(1).max(80),
  contactLastName: z.string().trim().min(1).max(80),
  contactEmail: z.string().email(),
  contactPhone: z.string().trim().min(6).max(32),
  websiteUrl: z
    .string()
    .trim()
    .max(240)
    .refine(
      (value) => value.length === 0 || z.string().url().safeParse(value).success,
      {
        message: "Enter a valid URL or leave this blank."
      }
    ),
  catalogSummary: z.string().trim().min(24).max(600),
  notes: z.string().trim().max(400).optional()
});

export type SellerApplicationFormValues = z.infer<
  typeof sellerApplicationFormSchema
>;
