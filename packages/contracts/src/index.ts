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
