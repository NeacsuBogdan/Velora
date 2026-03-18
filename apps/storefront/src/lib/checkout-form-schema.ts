import { z } from "zod";

export const checkoutFormSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  contactPhone: z.string().trim().min(6).max(32).optional().or(z.literal("")),
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional().or(z.literal("")),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional().or(z.literal("")),
  postalCode: z.string().trim().min(1).max(24),
  countryCode: z.string().trim().length(2),
  deliveryPhone: z
    .string()
    .trim()
    .max(32)
    .optional()
    .or(z.literal("")),
});

export type CheckoutFormValues = z.infer<typeof checkoutFormSchema>;

