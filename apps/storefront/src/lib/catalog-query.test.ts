import { describe, expect, it } from "vitest";

import {
  getQueryValue,
  getQueryValues,
  toUrlSearchParams
} from "./catalog-query";

describe("catalog query helpers", () => {
  it("normalizes arrays into repeated query parameters", () => {
    const params = toUrlSearchParams({
      brand: ["nordwave", "helio"],
      q: "phone"
    });

    expect(params.toString()).toContain("q=phone");
    expect(params.getAll("brand")).toEqual(["nordwave", "helio"]);
  });

  it("reads scalar and repeated values consistently", () => {
    const params = new URLSearchParams(
      "q=laptop&brand=vanta&brand=astra-mobile"
    );

    expect(getQueryValue(params, "q")).toBe("laptop");
    expect(getQueryValues(params, "brand")).toEqual([
      "vanta",
      "astra-mobile"
    ]);
  });
});
