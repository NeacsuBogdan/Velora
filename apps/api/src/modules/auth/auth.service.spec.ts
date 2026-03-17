import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { SessionStatus } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";

import { AuthService } from "./auth.service";

describe("AuthService", () => {
  const prisma = {
    role: {
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn(),
      create: vi.fn()
    },
    session: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn()
    },
    auditLog: {
      create: vi.fn()
    }
  };

  let authService: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    authService = new AuthService(prisma as never);
  });

  it("creates a session for valid credentials", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue(true as never);

    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      isActive: true,
      passwordHash: "hash",
      roleAssignments: [
        {
          role: {
            code: "CUSTOMER",
            name: "Customer"
          }
        }
      ]
    });
    prisma.session.create.mockResolvedValue({
      id: "session_1",
      expiresAt: new Date("2026-04-10T10:00:00.000Z")
    });

    const result = await authService.login(
      {
        email: "customer@velora.local",
        password: "Demo123!"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    );

    expect(prisma.session.create).toHaveBeenCalled();
    expect(prisma.auditLog.create).toHaveBeenCalled();
    expect(result.token).toHaveLength(64);
    expect(result.session.user.email).toBe("customer@velora.local");
    expect(result.session.user.roles[0]?.code).toBe("CUSTOMER");
  });

  it("registers a new customer account and issues a session", async () => {
    vi.spyOn(bcrypt, "hash").mockResolvedValue("hashed-password" as never);

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.role.findUnique.mockResolvedValue({
      id: "role_customer",
      code: "CUSTOMER",
      name: "Customer"
    });
    prisma.user.create.mockResolvedValue({
      id: "user_2",
      email: "new.customer@velora.local",
      firstName: "New",
      lastName: "Customer",
      isActive: true,
      passwordHash: "hashed-password",
      roleAssignments: [
        {
          role: {
            code: "CUSTOMER",
            name: "Customer"
          }
        }
      ]
    });
    prisma.session.create.mockResolvedValue({
      id: "session_2",
      expiresAt: new Date("2026-04-10T10:00:00.000Z")
    });

    const result = await authService.register(
      {
        firstName: "New",
        lastName: "Customer",
        email: "new.customer@velora.local",
        password: "Demo123!"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    );

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        email: "new.customer@velora.local",
        passwordHash: "hashed-password",
        firstName: "New",
        lastName: "Customer",
        roleAssignments: {
          create: {
            roleId: "role_customer"
          }
        }
      },
      include: {
        roleAssignments: {
          include: {
            role: true
          }
        }
      }
    });
    expect(prisma.session.create).toHaveBeenCalled();
    expect(result.session.user.email).toBe("new.customer@velora.local");
    expect(result.session.user.roles[0]?.code).toBe("CUSTOMER");
  });

  it("rejects duplicate customer registrations", async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: "user_existing"
    });

    await expect(
      authService.register(
        {
          firstName: "Demo",
          lastName: "Customer",
          email: "customer@velora.local",
          password: "Demo123!"
        },
        {}
      )
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("rejects invalid credentials", async () => {
    vi.spyOn(bcrypt, "compare").mockResolvedValue(false as never);

    prisma.user.findUnique.mockResolvedValue({
      id: "user_1",
      email: "customer@velora.local",
      firstName: "Demo",
      lastName: "Customer",
      isActive: true,
      passwordHash: "hash",
      roleAssignments: []
    });

    await expect(
      authService.login(
        {
          email: "customer@velora.local",
          password: "wrongpass"
        },
        {}
      )
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it("returns null for expired sessions", async () => {
    prisma.session.findUnique.mockResolvedValue({
      id: "session_1",
      status: SessionStatus.ACTIVE,
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      user: {
        id: "user_1",
        email: "customer@velora.local",
        firstName: "Demo",
        lastName: "Customer",
        isActive: true,
        roleAssignments: []
      }
    });

    const result = await authService.getSessionFromToken("raw-token");

    expect(result).toBeNull();
    expect(prisma.session.update).not.toHaveBeenCalled();
  });

  it("revokes sessions on logout", async () => {
    await authService.logout("raw-token");

    expect(prisma.session.updateMany).toHaveBeenCalledWith({
      where: {
        tokenHash: expect.any(String)
      },
      data: {
        status: SessionStatus.REVOKED
      }
    });
  });
});
