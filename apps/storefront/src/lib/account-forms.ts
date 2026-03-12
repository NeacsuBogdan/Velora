import type { AddressSummary, CustomerProfile } from "@velora/contracts";
import {
  updateProfileRequestSchema,
  upsertAddressRequestSchema
} from "@velora/contracts";
import { z } from "zod";

export const profileFormSchema = updateProfileRequestSchema;
export type ProfileFormValues = z.input<typeof profileFormSchema>;

export const addressFormSchema = upsertAddressRequestSchema;
export type AddressFormValues = z.input<typeof addressFormSchema>;

export function toProfileFormValues(
  profile: Pick<CustomerProfile, "firstName" | "lastName">
): ProfileFormValues {
  return {
    firstName: profile.firstName,
    lastName: profile.lastName
  };
}

export function createEmptyAddressFormValues(): AddressFormValues {
  return {
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
  };
}

export function toAddressFormValues(
  address: AddressSummary
): AddressFormValues {
  return {
    type: address.type,
    label: address.label,
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2 ?? "",
    city: address.city,
    state: address.state ?? "",
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    phone: address.phone ?? "",
    isDefault: address.isDefault
  };
}
