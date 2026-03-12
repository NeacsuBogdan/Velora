import { Prisma } from "@prisma/client";
import {
  addressSummarySchema,
  authenticatedUserSchema,
  customerProfileSchema
} from "@velora/contracts";

export const userProfileInclude =
  Prisma.validator<Prisma.UserDefaultArgs>()({
    include: {
      addresses: {
        orderBy: [
          {
            isDefault: "desc"
          },
          {
            createdAt: "asc"
          }
        ]
      },
      roleAssignments: {
        include: {
          role: true
        }
      }
    }
  });

export type UserProfileRecord = Prisma.UserGetPayload<typeof userProfileInclude>;

export function mapAuthenticatedUserSummary(user: UserProfileRecord) {
  return authenticatedUserSchema.parse({
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    roles: user.roleAssignments.map((assignment) => ({
      code: assignment.role.code,
      name: assignment.role.name
    }))
  });
}

export function mapAddress(address: UserProfileRecord["addresses"][number]) {
  return addressSummarySchema.parse({
    addressId: address.id,
    type: address.type,
    label: address.label,
    fullName: address.fullName,
    line1: address.line1,
    line2: address.line2,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    countryCode: address.countryCode,
    phone: address.phone,
    isDefault: address.isDefault,
    createdAt: address.createdAt.toISOString(),
    updatedAt: address.updatedAt.toISOString()
  });
}

export function mapCustomerProfile(
  user: UserProfileRecord,
  metrics: {
    addressCount: number;
    orderCount: number;
  }
) {
  const addresses = user.addresses.map((address) => mapAddress(address));
  const defaultShippingAddress =
    addresses.find(
      (address) => address.type === "SHIPPING" && address.isDefault
    ) ?? addresses.find((address) => address.type === "SHIPPING") ?? null;
  const defaultBillingAddress =
    addresses.find((address) => address.type === "BILLING" && address.isDefault) ??
    addresses.find((address) => address.type === "BILLING") ??
    null;

  return customerProfileSchema.parse({
    ...mapAuthenticatedUserSummary(user),
    defaultShippingAddress,
    defaultBillingAddress,
    metrics
  });
}
