import { describe, expect, it } from "vitest";

import { sellerActivationFormSchema } from "./seller-activation-schema";

describe("sellerActivationFormSchema", () => {
  it("accepts a valid seller activation payload", () => {
    const result = sellerActivationFormSchema.safeParse({
      firstName: "Mara",
      lastName: "Ionescu",
      password: "Demo123!",
      confirmPassword: "Demo123!"
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = sellerActivationFormSchema.safeParse({
      firstName: "Mara",
      lastName: "Ionescu",
      password: "Demo123!",
      confirmPassword: "Mismatch123!"
    });

    expect(result.success).toBe(false);
  });
});
