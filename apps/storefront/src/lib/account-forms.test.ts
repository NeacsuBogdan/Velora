import { describe, expect, it } from "vitest";

import {
  addressFormSchema,
  createEmptyAddressFormValues,
  toAddressFormValues,
  toProfileFormValues
} from "./account-forms";

describe("account form helpers", () => {
  it("creates predictable empty address defaults", () => {
    expect(createEmptyAddressFormValues()).toEqual({
      type: "SHIPPING",
      label: "",
      fullName: "",
      line1: "",
      line2: "",
      city: "",
      state: "",
      postalCode: "",
      countryCode: "RO",
      phone: "",
      isDefault: false
    });
  });

  it("maps API address records into editable form values", () => {
    expect(
      toAddressFormValues({
        addressId: "address-1",
        type: "BILLING",
        label: "Office",
        fullName: "Demo Customer",
        line1: "Business Street 9",
        line2: null,
        city: "Bucharest",
        state: "Bucuresti",
        postalCode: "020335",
        countryCode: "RO",
        phone: null,
        isDefault: true,
        createdAt: "2026-03-10T08:00:00.000Z",
        updatedAt: "2026-03-10T08:00:00.000Z"
      })
    ).toEqual({
      type: "BILLING",
      label: "Office",
      fullName: "Demo Customer",
      line1: "Business Street 9",
      line2: "",
      city: "Bucharest",
      state: "Bucuresti",
      postalCode: "020335",
      countryCode: "RO",
      phone: "",
      isDefault: true
    });
  });

  it("reuses the shared validation schema for country normalization", () => {
    const parsed = addressFormSchema.parse({
      type: "SHIPPING",
      label: "Home",
      fullName: "Demo Customer",
      line1: "Main Street 1",
      line2: "",
      city: "Bucharest",
      state: "",
      postalCode: "020331",
      countryCode: "ro",
      phone: "",
      isDefault: true
    });

    expect(parsed.countryCode).toBe("RO");
  });

  it("maps the editable profile subset", () => {
    expect(
      toProfileFormValues({
        firstName: "Demo",
        lastName: "Customer"
      })
    ).toEqual({
      firstName: "Demo",
      lastName: "Customer"
    });
  });
});
