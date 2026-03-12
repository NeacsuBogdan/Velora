import {
  Injectable,
  NotFoundException
} from "@nestjs/common";
import { Prisma, type AddressType } from "@prisma/client";
import {
  deleteAddressResponseSchema,
  type AuthenticatedUser,
  updateProfileRequestSchema,
  upsertAddressRequestSchema
} from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import {
  mapAddress,
  mapCustomerProfile,
  userProfileInclude
} from "./users.helpers";

type TransactionClient = Prisma.TransactionClient;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getCurrentUserProfile(viewer: AuthenticatedUser) {
    return this.getProfilePayload(viewer.id);
  }

  async updateCurrentUserProfile(
    viewer: AuthenticatedUser,
    rawInput: unknown
  ) {
    const input = updateProfileRequestSchema.parse(rawInput);

    const user = await this.prisma.user.update({
      where: {
        id: viewer.id
      },
      data: {
        firstName: input.firstName,
        lastName: input.lastName
      },
      include: userProfileInclude.include
    });

    await this.prisma.auditLog.create({
      data: {
        actorUserId: viewer.id,
        entityType: "USER",
        entityId: viewer.id,
        action: "CUSTOMER_PROFILE_UPDATED",
        details: {
          firstName: input.firstName,
          lastName: input.lastName
        }
      }
    });

    const orderCount = await this.prisma.order.count({
      where: {
        userId: viewer.id
      }
    });

    return mapCustomerProfile(user, {
      addressCount: user.addresses.length,
      orderCount
    });
  }

  async listAddresses(viewer: AuthenticatedUser) {
    const addresses = await this.prisma.address.findMany({
      where: {
        userId: viewer.id
      },
      orderBy: [
        {
          type: "asc"
        },
        {
          isDefault: "desc"
        },
        {
          createdAt: "asc"
        }
      ]
    });

    return addresses.map((address) => mapAddress(address));
  }

  async createAddress(viewer: AuthenticatedUser, rawInput: unknown) {
    const input = upsertAddressRequestSchema.parse(rawInput);

    const address = await this.prisma.$transaction(async (tx) => {
      const existingTypeCount = await tx.address.count({
        where: {
          userId: viewer.id,
          type: input.type
        }
      });

      const created = await tx.address.create({
        data: {
          userId: viewer.id,
          type: input.type,
          label: input.label,
          fullName: input.fullName,
          line1: input.line1,
          line2: this.normalizeOptionalString(input.line2),
          city: input.city,
          state: this.normalizeOptionalString(input.state),
          postalCode: input.postalCode,
          countryCode: input.countryCode,
          phone: this.normalizeOptionalString(input.phone)
        }
      });

      if (input.isDefault || existingTypeCount === 0) {
        await this.ensureSingleDefaultAddressWithinTransaction(
          tx,
          viewer.id,
          input.type,
          created.id
        );
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "ADDRESS",
          entityId: created.id,
          action: "CUSTOMER_ADDRESS_CREATED",
          details: {
            type: input.type,
            label: input.label,
            isDefault: input.isDefault || existingTypeCount === 0
          }
        }
      });

      return tx.address.findUniqueOrThrow({
        where: {
          id: created.id
        }
      });
    });

    return mapAddress(address);
  }

  async updateAddress(
    viewer: AuthenticatedUser,
    addressId: string,
    rawInput: unknown
  ) {
    const input = upsertAddressRequestSchema.parse(rawInput);

    const address = await this.prisma.$transaction(async (tx) => {
      const current = await tx.address.findFirst({
        where: {
          id: addressId,
          userId: viewer.id
        }
      });

      if (!current) {
        throw new NotFoundException(`Address ${addressId} was not found.`);
      }

      const shouldRetainDefault =
        current.isDefault && current.type === input.type;

      const updated = await tx.address.update({
        where: {
          id: current.id
        },
        data: {
          type: input.type,
          label: input.label,
          fullName: input.fullName,
          line1: input.line1,
          line2: this.normalizeOptionalString(input.line2),
          city: input.city,
          state: this.normalizeOptionalString(input.state),
          postalCode: input.postalCode,
          countryCode: input.countryCode,
          phone: this.normalizeOptionalString(input.phone),
          isDefault: shouldRetainDefault
        }
      });

      if (current.type !== updated.type && current.isDefault) {
        await this.ensureSingleDefaultAddressWithinTransaction(
          tx,
          viewer.id,
          current.type
        );
      }

      if (input.isDefault) {
        await this.ensureSingleDefaultAddressWithinTransaction(
          tx,
          viewer.id,
          updated.type,
          updated.id
        );
      } else {
        await this.ensureSingleDefaultAddressWithinTransaction(
          tx,
          viewer.id,
          updated.type,
          shouldRetainDefault ? updated.id : undefined
        );
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "ADDRESS",
          entityId: updated.id,
          action: "CUSTOMER_ADDRESS_UPDATED",
          details: {
            type: updated.type,
            label: updated.label,
            isDefault: input.isDefault || shouldRetainDefault
          }
        }
      });

      return tx.address.findUniqueOrThrow({
        where: {
          id: updated.id
        }
      });
    });

    return mapAddress(address);
  }

  async deleteAddress(viewer: AuthenticatedUser, addressId: string) {
    return this.prisma.$transaction(async (tx) => {
      const address = await tx.address.findFirst({
        where: {
          id: addressId,
          userId: viewer.id
        }
      });

      if (!address) {
        throw new NotFoundException(`Address ${addressId} was not found.`);
      }

      await tx.address.delete({
        where: {
          id: address.id
        }
      });

      if (address.isDefault) {
        await this.ensureSingleDefaultAddressWithinTransaction(
          tx,
          viewer.id,
          address.type
        );
      }

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "ADDRESS",
          entityId: address.id,
          action: "CUSTOMER_ADDRESS_DELETED",
          details: {
            type: address.type,
            label: address.label
          }
        }
      });

      return deleteAddressResponseSchema.parse({
        deletedAddressId: address.id
      });
    });
  }

  private async getProfilePayload(userId: string) {
    const [user, orderCount] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: {
          id: userId
        },
        include: userProfileInclude.include
      }),
      this.prisma.order.count({
        where: {
          userId
        }
      })
    ]);

    return mapCustomerProfile(user, {
      addressCount: user.addresses.length,
      orderCount
    });
  }

  private normalizeOptionalString(value?: string | null) {
    if (!value) {
      return null;
    }

    const normalized = value.trim();

    return normalized.length > 0 ? normalized : null;
  }

  private async ensureSingleDefaultAddressWithinTransaction(
    tx: TransactionClient,
    userId: string,
    type: AddressType,
    preferredAddressId?: string
  ) {
    if (preferredAddressId) {
      await tx.address.updateMany({
        where: {
          userId,
          type,
          id: {
            not: preferredAddressId
          },
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      await tx.address.update({
        where: {
          id: preferredAddressId
        },
        data: {
          isDefault: true
        }
      });

      return;
    }

    const currentDefault = await tx.address.findFirst({
      where: {
        userId,
        type,
        isDefault: true
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (currentDefault) {
      await tx.address.updateMany({
        where: {
          userId,
          type,
          id: {
            not: currentDefault.id
          },
          isDefault: true
        },
        data: {
          isDefault: false
        }
      });

      return;
    }

    const fallbackAddress = await tx.address.findFirst({
      where: {
        userId,
        type
      },
      orderBy: {
        createdAt: "asc"
      }
    });

    if (!fallbackAddress) {
      return;
    }

    await tx.address.update({
      where: {
        id: fallbackAddress.id
      },
      data: {
        isDefault: true
      }
    });
  }
}
