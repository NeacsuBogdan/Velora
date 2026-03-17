import {
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  completeSellerActivationRequestSchema,
  createSellerApplicationRequestSchema,
  reviewAdminSellerApplicationRequestSchema,
  reviewAdminSellerApplicationResponseSchema,
  sellerApplicationReceiptSchema,
  sellerApplicationStatusSchema,
  sellerActivationResponseSchema,
  type AuthenticatedUser
} from "@velora/contracts";
import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";

import { AuditService } from "../audit/audit.service";
import { AuthService } from "../auth/auth.service";
import { PrismaService } from "../database/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import {
  mapAdminSellerApplicationSummary,
  mapSellerActivationPreview,
  normalizeOptionalString,
  sellerApplicationInclude,
  slugifySellerName
} from "./seller-onboarding.helpers";

const sellerApplicationQuerySchema = z.object({
  q: z
    .preprocess(
      (value) =>
        typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined,
      z.string().max(120).optional()
    )
    .optional(),
  status: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0 ? value : undefined,
    sellerApplicationStatusSchema.optional()
  )
});

type LoginContext = {
  ipAddress?: string;
  userAgent?: string;
};

@Injectable()
export class SellerOnboardingService {
  private readonly storefrontUrl =
    process.env.NEXT_PUBLIC_STOREFRONT_URL ?? "http://localhost:3000";
  private readonly adminUrl =
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService
  ) {}

  async createApplication(rawInput: unknown) {
    const input = createSellerApplicationRequestSchema.parse(rawInput);
    const contactEmail = input.contactEmail.toLowerCase();

    await this.ensureApplicationEmailAvailability(contactEmail);

    const application = await this.prisma.sellerApplication.create({
      data: {
        displayName: input.displayName.trim(),
        legalName: input.legalName.trim(),
        contactFirstName: input.contactFirstName.trim(),
        contactLastName: input.contactLastName.trim(),
        contactEmail,
        contactPhone: normalizeOptionalString(input.contactPhone) ?? undefined,
        websiteUrl: normalizeOptionalString(input.websiteUrl) ?? undefined,
        catalogSummary: input.catalogSummary.trim(),
        notes: normalizeOptionalString(input.notes) ?? undefined
      }
    });

    await this.auditService.record(
      null,
      "SELLER_APPLICATION",
      application.id,
      "SELLER_APPLICATION_SUBMITTED",
      {
        contactEmail,
        displayName: application.displayName
      }
    );

    await this.notificationsService.notifyAdmins({
      kind: "SELLER_APPLICATION",
      level: "ACTION_REQUIRED",
      title: "New seller application",
      message: `${application.displayName} submitted a merchant onboarding request and is awaiting review.`,
      linkUrl: `${this.adminUrl}#seller-applications`
    });

    return sellerApplicationReceiptSchema.parse({
      applicationId: application.id,
      status: application.status,
      submittedAt: application.createdAt.toISOString(),
      message:
        "Application received. The marketplace team can now review and approve your merchant onboarding."
    });
  }

  async listApplications(rawQuery: Record<string, unknown>) {
    const query = sellerApplicationQuerySchema.parse(rawQuery);
    const applications = await this.prisma.sellerApplication.findMany({
      where: {
        ...(query.status ? { status: query.status } : {}),
        ...(query.q
          ? {
              OR: [
                {
                  displayName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  legalName: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                },
                {
                  contactEmail: {
                    contains: query.q,
                    mode: "insensitive"
                  }
                }
              ]
            }
          : {})
      },
      include: sellerApplicationInclude.include,
      orderBy: [{ createdAt: "desc" }],
      take: 30
    });

    return applications.map((application) =>
      mapAdminSellerApplicationSummary(application)
    );
  }

  async reviewApplication(
    viewer: AuthenticatedUser,
    applicationId: string,
    rawInput: unknown
  ) {
    const input = reviewAdminSellerApplicationRequestSchema.parse(rawInput);
    const application = await this.prisma.sellerApplication.findUnique({
      where: {
        id: applicationId
      },
      include: sellerApplicationInclude.include
    });

    if (!application) {
      throw new NotFoundException(
        `Seller application ${applicationId} was not found.`
      );
    }

    if (application.status === "ACTIVATED") {
      throw new BadRequestException(
        "This seller application has already been activated."
      );
    }

    const note = normalizeOptionalString(input.note);

    if (input.decision === "REVIEWING") {
      const nextApplication = await this.prisma.sellerApplication.update({
        where: {
          id: applicationId
        },
        data: {
          status: "REVIEWING",
          reviewedByUserId: viewer.id,
          reviewedAt: new Date(),
          reviewNote: note,
          activationExpiresAt: null
        },
        include: sellerApplicationInclude.include
      });

      await this.prisma.sellerActivationToken.deleteMany({
        where: {
          sellerApplicationId: applicationId,
          consumedAt: null
        }
      });

      await this.auditService.record(
        viewer.id,
        "SELLER_APPLICATION",
        applicationId,
        "SELLER_APPLICATION_REVIEWING",
        {
          note
        }
      );

      return reviewAdminSellerApplicationResponseSchema.parse({
        ...mapAdminSellerApplicationSummary(nextApplication),
        activationLink: null
      });
    }

    if (input.decision === "REJECT") {
      const nextApplication = await this.prisma.sellerApplication.update({
        where: {
          id: applicationId
        },
        data: {
          status: "REJECTED",
          reviewedByUserId: viewer.id,
          reviewedAt: new Date(),
          reviewNote: note,
          activationExpiresAt: null
        },
        include: sellerApplicationInclude.include
      });

      await this.prisma.sellerActivationToken.deleteMany({
        where: {
          sellerApplicationId: applicationId,
          consumedAt: null
        }
      });

      await this.auditService.record(
        viewer.id,
        "SELLER_APPLICATION",
        applicationId,
        "SELLER_APPLICATION_REJECTED",
        {
          note
        }
      );

      return reviewAdminSellerApplicationResponseSchema.parse({
        ...mapAdminSellerApplicationSummary(nextApplication),
        activationLink: null
      });
    }

    await this.ensureApplicationEmailAvailability(
      application.contactEmail,
      applicationId
    );

    const activationWindowDays = input.activationWindowDays ?? 7;
    const rawToken = randomBytes(32).toString("hex");
    const tokenHash = this.hashToken(rawToken);
    const activationExpiresAt = new Date(
      Date.now() + activationWindowDays * 24 * 60 * 60 * 1000
    );

    const nextApplication = await this.prisma.$transaction(async (tx) => {
      const updatedApplication = await tx.sellerApplication.update({
        where: {
          id: applicationId
        },
        data: {
          status: "ACTIVATION_PENDING",
          reviewedByUserId: viewer.id,
          reviewedAt: new Date(),
          reviewNote: note,
          activationExpiresAt
        },
        include: sellerApplicationInclude.include
      });

      await tx.sellerActivationToken.upsert({
        where: {
          sellerApplicationId: applicationId
        },
        update: {
          tokenHash,
          expiresAt: activationExpiresAt,
          consumedAt: null
        },
        create: {
          sellerApplicationId: applicationId,
          tokenHash,
          expiresAt: activationExpiresAt
        }
      });

      await tx.auditLog.create({
        data: {
          actorUserId: viewer.id,
          entityType: "SELLER_APPLICATION",
          entityId: applicationId,
          action: "SELLER_APPLICATION_APPROVED",
          details: {
            activationWindowDays,
            contactEmail: application.contactEmail
          }
        }
      });

      return updatedApplication;
    });

    return reviewAdminSellerApplicationResponseSchema.parse({
      ...mapAdminSellerApplicationSummary(nextApplication),
      activationLink: this.buildActivationLink(rawToken)
    });
  }

  async getActivationPreview(rawToken: string) {
    const activation = await this.findActivationTokenOrThrow(rawToken);

    return mapSellerActivationPreview(activation.sellerApplication);
  }

  async activate(
    rawToken: string,
    rawInput: unknown,
    context: LoginContext
  ) {
    const input = completeSellerActivationRequestSchema.parse(rawInput);
    const activation = await this.findActivationTokenOrThrow(rawToken);
    const sellerRoleId = await this.resolveSellerRoleId();
    const passwordHash = await bcrypt.hash(input.password, 12);
    const sellerSlug = await this.generateUniqueSellerSlug(
      activation.sellerApplication.displayName
    );

    await this.ensureActivationEmailAvailability(
      activation.sellerApplication.contactEmail
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: activation.sellerApplication.contactEmail,
          passwordHash,
          firstName: input.firstName.trim(),
          lastName: input.lastName.trim(),
          roleAssignments: {
            create: {
              roleId: sellerRoleId
            }
          }
        }
      });

      const seller = await tx.seller.create({
        data: {
          slug: sellerSlug,
          displayName: activation.sellerApplication.displayName,
          legalName: activation.sellerApplication.legalName,
          contactEmail: activation.sellerApplication.contactEmail,
          ownerUserId: user.id,
          status: "ACTIVE"
        }
      });

      await tx.sellerApplication.update({
        where: {
          id: activation.sellerApplication.id
        },
        data: {
          status: "ACTIVATED",
          sellerId: seller.id,
          activatedAt: new Date()
        }
      });

      await tx.sellerActivationToken.update({
        where: {
          id: activation.id
        },
        data: {
          consumedAt: new Date()
        }
      });

      await tx.auditLog.createMany({
        data: [
          {
            actorUserId: user.id,
            entityType: "SELLER_APPLICATION",
            entityId: activation.sellerApplication.id,
            action: "SELLER_APPLICATION_ACTIVATED",
            details: {
              sellerId: seller.id
            } as Prisma.InputJsonValue
          },
          {
            actorUserId: user.id,
            entityType: "SELLER",
            entityId: seller.id,
            action: "SELLER_ACCOUNT_CREATED",
            details: {
              applicationId: activation.sellerApplication.id
            } as Prisma.InputJsonValue
          }
        ]
      });

      return {
        sellerSlug: seller.slug,
        userId: user.id
      };
    });

    const session = await this.authService.issueSessionForUserId(
      result.userId,
      context,
      "SELLER_ACTIVATED"
    );

    await Promise.all([
      this.notificationsService.notifyUser(result.userId, {
        kind: "ACCOUNT",
        level: "SUCCESS",
        title: "Seller workspace activated",
        message:
          "Your merchant account is active. You can now manage listings, stock, and seller orders.",
        linkUrl: `${this.storefrontUrl}/seller`,
        actorUserId: result.userId
      }),
      this.notificationsService.notifyAdmins({
        kind: "SELLER_APPLICATION",
        level: "SUCCESS",
        title: "Seller activated",
        message: `${activation.sellerApplication.displayName} completed activation and can now operate in the seller workspace.`,
        linkUrl: `${this.adminUrl}#sellers`,
        actorUserId: result.userId
      })
    ]);

    return {
      token: session.token,
      response: sellerActivationResponseSchema.parse({
        sellerSlug: result.sellerSlug,
        session: session.session
      })
    };
  }

  private async ensureApplicationEmailAvailability(
    contactEmail: string,
    excludeApplicationId?: string
  ) {
    const [existingUser, existingSeller, existingApplication] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          email: contactEmail
        },
        select: {
          id: true
        }
      }),
      this.prisma.seller.findUnique({
        where: {
          contactEmail
        },
        select: {
          id: true
        }
      }),
      this.prisma.sellerApplication.findFirst({
        where: {
          contactEmail,
          ...(excludeApplicationId
            ? {
                NOT: {
                  id: excludeApplicationId
                }
              }
            : {}),
          status: {
            in: ["SUBMITTED", "REVIEWING", "ACTIVATION_PENDING", "ACTIVATED"]
          }
        },
        select: {
          id: true
        }
      })
    ]);

    if (existingUser || existingSeller || existingApplication) {
      throw new ConflictException(
        "A seller account or active onboarding request already uses this contact email."
      );
    }
  }

  private async ensureActivationEmailAvailability(contactEmail: string) {
    const [existingUser, existingSeller] = await Promise.all([
      this.prisma.user.findUnique({
        where: {
          email: contactEmail
        },
        select: {
          id: true
        }
      }),
      this.prisma.seller.findUnique({
        where: {
          contactEmail
        },
        select: {
          id: true
        }
      })
    ]);

    if (existingUser || existingSeller) {
      throw new ConflictException(
        "This activation email is already linked to an existing account."
      );
    }
  }

  private async resolveSellerRoleId() {
    const sellerRole = await this.prisma.role.findUnique({
      where: {
        code: "SELLER"
      }
    });

    if (!sellerRole) {
      throw new InternalServerErrorException(
        "Seller activation is unavailable because the seller role is missing."
      );
    }

    return sellerRole.id;
  }

  private async generateUniqueSellerSlug(displayName: string) {
    const baseSlug = slugifySellerName(displayName) || "merchant";
    let candidate = baseSlug;
    let suffix = 2;

    while (
      await this.prisma.seller.findUnique({
        where: {
          slug: candidate
        },
        select: {
          id: true
        }
      })
    ) {
      candidate = `${baseSlug}-${suffix}`;
      suffix += 1;
    }

    return candidate;
  }

  private buildActivationLink(rawToken: string) {
    return `${this.storefrontUrl}/seller/activate?token=${encodeURIComponent(
      rawToken
    )}`;
  }

  private async findActivationTokenOrThrow(rawToken: string) {
    const activation = await this.prisma.sellerActivationToken.findUnique({
      where: {
        tokenHash: this.hashToken(rawToken)
      },
      include: {
        sellerApplication: true
      }
    });

    if (!activation) {
      throw new NotFoundException("Seller activation link was not found.");
    }

    if (activation.consumedAt) {
      throw new BadRequestException("This seller activation link has already been used.");
    }

    if (activation.expiresAt <= new Date()) {
      throw new BadRequestException("This seller activation link has expired.");
    }

    if (activation.sellerApplication.status !== "ACTIVATION_PENDING") {
      throw new BadRequestException(
        "This seller application is not awaiting activation."
      );
    }

    return activation;
  }

  private hashToken(rawToken: string) {
    return createHash("sha256").update(rawToken).digest("hex");
  }
}
