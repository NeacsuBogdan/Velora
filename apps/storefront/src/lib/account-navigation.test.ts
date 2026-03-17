import { describe, expect, it } from "vitest";

import { accountNavigation } from "./account-navigation";

describe("accountNavigation", () => {
  it("exposes overview, addresses, orders, and notifications sections", () => {
    expect(accountNavigation.map((item) => item.href)).toEqual([
      "/account",
      "/account/addresses",
      "/account/orders",
      "/notifications"
    ]);
  });
});
