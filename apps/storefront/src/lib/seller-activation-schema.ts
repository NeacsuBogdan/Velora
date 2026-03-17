import { z } from "zod";

export const sellerActivationFormSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    password: z.string().min(8),
    confirmPassword: z.string().min(8)
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords must match."
  });

export type SellerActivationFormValues = z.infer<
  typeof sellerActivationFormSchema
>;
