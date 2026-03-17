import { describe, expect, it } from "vitest";

import { registerFormSchema } from "./register-schema";

describe("registerFormSchema", () => {
  it("accepts a valid customer registration payload", () => {
    const result = registerFormSchema.safeParse({
      firstName: "Ada",
      lastName: "Ionescu",
      email: "ada@example.com",
      password: "Demo123!",
      confirmPassword: "Demo123!"
    });

    expect(result.success).toBe(true);
  });

  it("rejects mismatched passwords", () => {
    const result = registerFormSchema.safeParse({
      firstName: "Ada",
      lastName: "Ionescu",
      email: "ada@example.com",
      password: "Demo123!",
      confirmPassword: "Demo999!"
    });

    expect(result.success).toBe(false);
  });
});
