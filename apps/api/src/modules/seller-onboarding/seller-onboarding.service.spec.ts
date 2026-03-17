import { beforeEach, describe, expect, it, vi } from "vitest";

import type { AuthenticatedUser, SessionResponse } from "@velora/contracts";

import { SellerOnboardingService } from "./seller-onboarding.service";

const adminViewer: AuthenticatedUser = {
  id: "admin-1",
  email: "admin@velora.local",
  firstName: "Platform",
  lastName: "Admin",
  roles: [
    {
      code: "ADMIN",
      name: "Administrator"
    }
  ]
};

describe("SellerOnboardingService", () => {
  const tx = {
    sellerApplication: {
      update: vi.fn()
    },
    sellerActivationToken: {
      upsert: vi.fn(),
      update: vi.fn()
    },
    auditLog: {
      create: vi.fn(),
      createMany: vi.fn()
    },
    user: {
      create: vi.fn()
    },
    seller: {
      create: vi.fn()
    }
  };

  const prisma = {
    $transaction: vi.fn((callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx)
    ),
    sellerApplication: {
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    sellerActivationToken: {
      deleteMany: vi.fn(),
      findUnique: vi.fn()
    },
    user: {
      findUnique: vi.fn()
    },
    seller: {
      findUnique: vi.fn()
    },
    role: {
      findUnique: vi.fn()
    }
  };

  const auditService = {
    record: vi.fn()
  };

  const authService = {
    issueSessionForUserId: vi.fn()
  };
  const notificationsService = {
    notifyAdmins: vi.fn(),
    notifyUser: vi.fn()
  };

  let service: SellerOnboardingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new SellerOnboardingService(
      prisma as never,
      auditService as never,
      authService as never,
      notificationsService as never
    );

    tx.sellerApplication.update.mockResolvedValue(undefined);
    tx.sellerActivationToken.upsert.mockResolvedValue(undefined);
    tx.sellerActivationToken.update.mockResolvedValue(undefined);
    tx.auditLog.create.mockResolvedValue(undefined);
    tx.auditLog.createMany.mockResolvedValue({ count: 2 });
    tx.user.create.mockResolvedValue({ id: "seller-user-1" });
    tx.seller.create.mockResolvedValue({ id: "seller-1", slug: "peak-labs" });
    prisma.sellerApplication.findMany.mockResolvedValue([]);
    prisma.sellerActivationToken.deleteMany.mockResolvedValue({ count: 0 });
  });

  it("submits a seller application", async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.seller.findUnique.mockResolvedValue(null);
    prisma.sellerApplication.findFirst.mockResolvedValue(null);
    prisma.sellerApplication.create.mockResolvedValue({
      id: "application-1",
      status: "SUBMITTED",
      displayName: "Peak Labs",
      createdAt: new Date("2026-03-17T18:00:00.000Z")
    });

    const result = await service.createApplication({
      displayName: "Peak Labs",
      legalName: "Peak Labs SRL",
      contactFirstName: "Mara",
      contactLastName: "Ionescu",
      contactEmail: "merchant@example.com",
      contactPhone: "+40 721 222 333",
      catalogSummary: "Performance accessories and compact electronics for active urban buyers."
    });

    expect(prisma.sellerApplication.create).toHaveBeenCalled();
    expect(auditService.record).toHaveBeenCalledWith(
      null,
      "SELLER_APPLICATION",
      "application-1",
      "SELLER_APPLICATION_SUBMITTED",
      expect.objectContaining({
        contactEmail: "merchant@example.com"
      })
    );
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
    expect(result.status).toBe("SUBMITTED");
  });

  it("approves an application and returns a seller activation link", async () => {
    const approvedAt = new Date("2026-03-17T18:10:00.000Z");

    prisma.sellerApplication.findUnique.mockResolvedValue({
      id: "application-1",
      displayName: "Peak Labs",
      legalName: "Peak Labs SRL",
      contactFirstName: "Mara",
      contactLastName: "Ionescu",
      contactEmail: "merchant@example.com",
      contactPhone: "+40 721 222 333",
      websiteUrl: "https://peaklabs.example",
      catalogSummary: "Performance accessories and compact electronics for active urban buyers.",
      notes: null,
      status: "SUBMITTED",
      reviewedByUser: null,
      reviewNote: null,
      reviewedAt: null,
      activationExpiresAt: null,
      activatedAt: null,
      seller: null,
      createdAt: new Date("2026-03-17T18:00:00.000Z"),
      updatedAt: new Date("2026-03-17T18:00:00.000Z")
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.seller.findUnique.mockResolvedValue(null);
    prisma.sellerApplication.findFirst.mockResolvedValue(null);
    tx.sellerApplication.update.mockResolvedValue({
      id: "application-1",
      displayName: "Peak Labs",
      legalName: "Peak Labs SRL",
      contactFirstName: "Mara",
      contactLastName: "Ionescu",
      contactEmail: "merchant@example.com",
      contactPhone: "+40 721 222 333",
      websiteUrl: "https://peaklabs.example",
      catalogSummary: "Performance accessories and compact electronics for active urban buyers.",
      notes: null,
      status: "ACTIVATION_PENDING",
      reviewedByUser: {
        email: "admin@velora.local"
      },
      reviewNote: "Looks good.",
      reviewedAt: approvedAt,
      activationExpiresAt: new Date("2026-03-24T18:10:00.000Z"),
      activatedAt: null,
      seller: null,
      createdAt: new Date("2026-03-17T18:00:00.000Z"),
      updatedAt: approvedAt
    });

    const result = await service.reviewApplication(adminViewer, "application-1", {
      decision: "APPROVE",
      note: "Looks good."
    });

    expect(tx.sellerActivationToken.upsert).toHaveBeenCalled();
    expect(result.status).toBe("ACTIVATION_PENDING");
    expect(result.activationLink).toContain("/seller/activate?token=");
  });

  it("activates an approved seller application into a seller session", async () => {
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);
    const session: SessionResponse = {
      sessionId: "session-1",
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: {
        id: "seller-user-1",
        email: "merchant@example.com",
        firstName: "Mara",
        lastName: "Ionescu",
        roles: [
          {
            code: "SELLER",
            name: "Seller"
          }
        ]
      }
    };

    prisma.sellerActivationToken.findUnique.mockResolvedValue({
      id: "token-record-1",
      expiresAt,
      consumedAt: null,
      sellerApplication: {
        id: "application-1",
        displayName: "Peak Labs",
        legalName: "Peak Labs SRL",
        contactFirstName: "Mara",
        contactLastName: "Ionescu",
        contactEmail: "merchant@example.com",
        status: "ACTIVATION_PENDING",
        activationExpiresAt: expiresAt
      }
    });
    prisma.role.findUnique.mockResolvedValue({
      id: "role-seller"
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.seller.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    authService.issueSessionForUserId.mockResolvedValue({
      token: "seller-session-token",
      session
    });

    const result = await service.activate(
      "raw-activation-token",
      {
        firstName: "Mara",
        lastName: "Ionescu",
        password: "Demo123!"
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      }
    );

    expect(tx.user.create).toHaveBeenCalled();
    expect(tx.seller.create).toHaveBeenCalledWith({
      data: {
        slug: "peak-labs",
        displayName: "Peak Labs",
        legalName: "Peak Labs SRL",
        contactEmail: "merchant@example.com",
        ownerUserId: "seller-user-1",
        status: "ACTIVE"
      }
    });
    expect(authService.issueSessionForUserId).toHaveBeenCalledWith(
      "seller-user-1",
      {
        ipAddress: "127.0.0.1",
        userAgent: "vitest"
      },
      "SELLER_ACTIVATED"
    );
    expect(notificationsService.notifyUser).toHaveBeenCalled();
    expect(notificationsService.notifyAdmins).toHaveBeenCalled();
    expect(result.token).toBe("seller-session-token");
    expect(result.response.sellerSlug).toBe("peak-labs");
  });
});
