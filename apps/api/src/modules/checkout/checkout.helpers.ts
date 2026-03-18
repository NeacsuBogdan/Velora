import {
  checkoutAddressSummarySchema,
  checkoutContactSummarySchema,
  type CheckoutAddressInput,
  type CheckoutAddressSummary,
  type CheckoutContactInput,
  type CheckoutContactSummary
} from "@velora/contracts";

function normalizeOptionalString(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function serializeCheckoutContact(
  input: CheckoutContactInput
): CheckoutContactSummary {
  return checkoutContactSummarySchema.parse({
    firstName: input.firstName.trim(),
    lastName: input.lastName.trim(),
    email: input.email.trim().toLowerCase(),
    phone: normalizeOptionalString(input.phone)
  });
}

export function serializeCheckoutAddress(
  input: CheckoutAddressInput
): CheckoutAddressSummary {
  return checkoutAddressSummarySchema.parse({
    fullName: input.fullName.trim(),
    line1: input.line1.trim(),
    line2: normalizeOptionalString(input.line2),
    city: input.city.trim(),
    state: normalizeOptionalString(input.state),
    postalCode: input.postalCode.trim(),
    countryCode: input.countryCode.trim().toUpperCase(),
    phone: normalizeOptionalString(input.phone)
  });
}

export function parseCheckoutContactSnapshot(
  value: unknown
): CheckoutContactSummary | null {
  const parsed = checkoutContactSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function parseCheckoutAddressSnapshot(
  value: unknown
): CheckoutAddressSummary | null {
  const parsed = checkoutAddressSummarySchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

