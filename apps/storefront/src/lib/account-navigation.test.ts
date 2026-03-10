import { describe, expect, it } from "vitest";

import { accountNavigation } from "./account-navigation";

describe("accountNavigation", () => {
  it("exposes overview and addresses sections", () => {
    expect(accountNavigation.map((item) => item.href)).toEqual([
      "/account",
      "/account/addresses"
    ]);
  });
});
