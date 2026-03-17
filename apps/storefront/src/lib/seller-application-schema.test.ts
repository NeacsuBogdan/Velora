import { describe, expect, it } from "vitest";

import { sellerApplicationFormSchema } from "./seller-application-schema";

describe("sellerApplicationFormSchema", () => {
  it("accepts a valid merchant application", () => {
    const result = sellerApplicationFormSchema.safeParse({
      displayName: "Peak Labs",
      legalName: "Peak Labs SRL",
      contactFirstName: "Mara",
      contactLastName: "Ionescu",
      contactEmail: "merchant@example.com",
      contactPhone: "+40 721 222 333",
      websiteUrl: "https://peaklabs.example",
      catalogSummary:
        "Performance accessories and compact electronics for active urban buyers.",
      notes: "Already shipping nationwide."
    });

    expect(result.success).toBe(true);
  });

  it("rejects incomplete merchant applications", () => {
    const result = sellerApplicationFormSchema.safeParse({
      displayName: "AB",
      legalName: "",
      contactFirstName: "",
      contactLastName: "",
      contactEmail: "bad-email",
      contactPhone: "123",
      websiteUrl: "not-a-url",
      catalogSummary: "short"
    });

    expect(result.success).toBe(false);
  });
});
