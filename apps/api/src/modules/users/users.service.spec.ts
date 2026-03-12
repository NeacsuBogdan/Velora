import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsersService } from "./users.service";

describe("UsersService", () => {
  const tx = {
    address: {
      count: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
    user: {
      findUniqueOrThrow: vi.fn(),
      update: vi.fn()
    },
    order: {
      count: vi.fn()
    },
    address: {
      findMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  let usersService: UsersService;

  beforeEach(() => {
    vi.clearAllMocks();
    usersService = new UsersService(prisma as never);
  });

  it("maps the current customer profile with default addresses and metrics", async () => {
    prisma.user.findUniqueOrThrow.mockResolvedValue({
      id: "user-1",
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      addresses: [
        {
          id: "address-1",
          type: "SHIPPING",
          label: "Home",
          fullName: "Demo Customer",
          line1: "Main Street 1",
          line2: null,
          city: "Bucharest",
          state: "Bucuresti",
          postalCode: "020331",
          countryCode: "RO",
          phone: null,
          isDefault: true,
          createdAt: new Date("2026-03-10T08:00:00.000Z"),
          updatedAt: new Date("2026-03-10T08:00:00.000Z")
        },
        {
          id: "address-2",
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
          createdAt: new Date("2026-03-11T08:00:00.000Z"),
          updatedAt: new Date("2026-03-11T08:00:00.000Z")
        }
      ],
      roleAssignments: [
        {
          role: {
            code: "CUSTOMER",
            name: "Customer"
          }
        }
      ]
    });
    prisma.order.count.mockResolvedValue(3);

    const profile = await usersService.getCurrentUserProfile({
      id: "user-1",
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      roles: [
        {
          code: "CUSTOMER",
          name: "Customer"
        }
      ]
    });

    expect(profile.metrics.orderCount).toBe(3);
    expect(profile.metrics.addressCount).toBe(2);
    expect(profile.defaultShippingAddress?.addressId).toBe("address-1");
    expect(profile.defaultBillingAddress?.addressId).toBe("address-2");
  });

  it("marks the first address of a type as default on create", async () => {
    tx.address.count.mockResolvedValue(0);
    tx.address.create.mockResolvedValue({
      id: "address-1",
      type: "SHIPPING",
      label: "Home",
      fullName: "Demo Customer",
      line1: "Main Street 1",
      line2: null,
      city: "Bucharest",
      state: "Bucuresti",
      postalCode: "020331",
      countryCode: "RO",
      phone: null,
      isDefault: true,
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      updatedAt: new Date("2026-03-10T08:00:00.000Z")
    });
    tx.address.findUniqueOrThrow.mockResolvedValue({
      id: "address-1",
      type: "SHIPPING",
      label: "Home",
      fullName: "Demo Customer",
      line1: "Main Street 1",
      line2: null,
      city: "Bucharest",
      state: "Bucuresti",
      postalCode: "020331",
      countryCode: "RO",
      phone: null,
      isDefault: true,
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      updatedAt: new Date("2026-03-10T08:00:00.000Z")
    });

    const address = await usersService.createAddress(
      {
        id: "user-1",
        email: "customer@velora.local",
        firstName: "Demo",
        lastName: "Customer",
        roles: [
          {
            code: "CUSTOMER",
            name: "Customer"
          }
        ]
      },
      {
        type: "SHIPPING",
        label: "Home",
        fullName: "Demo Customer",
        line1: "Main Street 1",
        city: "Bucharest",
        state: "Bucuresti",
        postalCode: "020331",
        countryCode: "ro",
        isDefault: false
      }
    );

    expect(tx.address.create).toHaveBeenCalled();
    expect(tx.address.update).toHaveBeenCalledWith({
      where: {
        id: "address-1"
      },
      data: {
        isDefault: true
      }
    });
    expect(address.isDefault).toBe(true);
    expect(address.countryCode).toBe("RO");
  });

  it("promotes another address when deleting the default address", async () => {
    tx.address.findFirst
      .mockResolvedValueOnce({
        id: "address-1",
        type: "SHIPPING",
        label: "Home",
        isDefault: true
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: "address-2",
        type: "SHIPPING",
        label: "Office",
        isDefault: false
      });

    const result = await usersService.deleteAddress(
      {
        id: "user-1",
        email: "customer@velora.local",
        firstName: "Demo",
        lastName: "Customer",
        roles: [
          {
            code: "CUSTOMER",
            name: "Customer"
          }
        ]
      },
      "address-1"
    );

    expect(tx.address.delete).toHaveBeenCalledWith({
      where: {
        id: "address-1"
      }
    });
    expect(tx.address.update).toHaveBeenCalledWith({
      where: {
        id: "address-2"
      },
      data: {
        isDefault: true
      }
    });
    expect(result.deletedAddressId).toBe("address-1");
  });
});
