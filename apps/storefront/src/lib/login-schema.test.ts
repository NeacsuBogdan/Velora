import { describe, expect, it } from "vitest";

import { loginFormSchema } from "./login-schema";

describe("loginFormSchema", () => {
  it("accepts valid credentials", () => {
    const result = loginFormSchema.safeParse({
      email: "customer@velora.local",
      password: "Demo123!"
    });

    expect(result.success).toBe(true);
  });

  it("rejects invalid credentials", () => {
    const result = loginFormSchema.safeParse({
      email: "bad-email",
      password: "short"
    });

    expect(result.success).toBe(false);
  });
});
