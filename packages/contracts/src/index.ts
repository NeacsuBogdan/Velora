import { userRoles } from "@velora/domain";
import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  environment: z.enum(["development", "test", "production"]),
  timestamp: z.string().datetime(),
  version: z.string()
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const viewerSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  role: z.enum(userRoles)
});

export type Viewer = z.infer<typeof viewerSchema>;

export const categoryPreviewSchema = z.object({
  slug: z.string(),
  title: z.string(),
  description: z.string()
});

export type CategoryPreview = z.infer<typeof categoryPreviewSchema>;

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export type LoginRequest = z.infer<typeof loginRequestSchema>;

export const roleSummarySchema = z.object({
  code: z.enum(userRoles),
  name: z.string()
});

export const authenticatedUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  roles: z.array(roleSummarySchema)
});

export type AuthenticatedUser = z.infer<typeof authenticatedUserSchema>;

export const sessionResponseSchema = z.object({
  sessionId: z.string(),
  expiresAt: z.string().datetime(),
  user: authenticatedUserSchema
});

export type SessionResponse = z.infer<typeof sessionResponseSchema>;

export const domainOverviewSchema = z.object({
  scope: z.string(),
  metrics: z.record(z.string(), z.number()),
  notes: z.array(z.string())
});

export type DomainOverview = z.infer<typeof domainOverviewSchema>;
