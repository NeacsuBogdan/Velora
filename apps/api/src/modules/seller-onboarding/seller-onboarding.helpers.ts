import { Prisma } from "@prisma/client";
import {
  adminSellerApplicationSummarySchema,
  sellerActivationPreviewSchema
} from "@velora/contracts";

export const sellerApplicationInclude =
  Prisma.validator<Prisma.SellerApplicationDefaultArgs>()({
    include: {
      reviewedByUser: {
        select: {
          email: true
        }
      },
      seller: {
        select: {
          id: true,
          displayName: true
        }
      }
    }
  });

export type SellerApplicationRecord = Prisma.SellerApplicationGetPayload<
  typeof sellerApplicationInclude
>;

export function normalizeOptionalString(value?: string | null) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : null;
}

export function slugifySellerName(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 48);
}

export function mapAdminSellerApplicationSummary(
  application: SellerApplicationRecord
) {
  return adminSellerApplicationSummarySchema.parse({
    applicationId: application.id,
    displayName: application.displayName,
    legalName: application.legalName,
    contactName: `${application.contactFirstName} ${application.contactLastName}`.trim(),
    contactEmail: application.contactEmail,
    contactPhone: application.contactPhone ?? null,
    websiteUrl: application.websiteUrl ?? null,
    catalogSummary: application.catalogSummary,
    notes: application.notes ?? null,
    status: application.status,
    reviewNote: application.reviewNote ?? null,
    reviewedByEmail: application.reviewedByUser?.email ?? null,
    reviewedAt: application.reviewedAt?.toISOString() ?? null,
    activationExpiresAt: application.activationExpiresAt?.toISOString() ?? null,
    activatedAt: application.activatedAt?.toISOString() ?? null,
    sellerId: application.seller?.id ?? null,
    sellerDisplayName: application.seller?.displayName ?? null,
    createdAt: application.createdAt.toISOString(),
    updatedAt: application.updatedAt.toISOString()
  });
}

export function mapSellerActivationPreview(application: {
  id: string;
  displayName: string;
  legalName: string;
  contactEmail: string;
  contactFirstName: string;
  contactLastName: string;
  status: string;
  activationExpiresAt: Date | null;
  catalogSummary: string;
}) {
  return sellerActivationPreviewSchema.parse({
    applicationId: application.id,
    displayName: application.displayName,
    legalName: application.legalName,
    contactEmail: application.contactEmail,
    contactName: `${application.contactFirstName} ${application.contactLastName}`.trim(),
    status: application.status,
    expiresAt:
      application.activationExpiresAt?.toISOString() ?? new Date().toISOString(),
    catalogSummary: application.catalogSummary
  });
}
