import { z } from "zod";

export const runtimeEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development")
});

export const apiEnvSchema = runtimeEnvSchema.extend({
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default("api"),
  DATABASE_URL: z.string().default("postgresql://velora:velora@localhost:5433/velora"),
  REDIS_URL: z.string().default("redis://localhost:6379"),
  OPENSEARCH_URL: z.string().default("http://localhost:9200"),
  OPENSEARCH_INDEX: z.string().default("velora_products_v1"),
  STRIPE_SECRET_KEY: z.string().default("sk_test_placeholder"),
  STRIPE_WEBHOOK_SECRET: z.string().default("whsec_placeholder")
});

export const storefrontEnvSchema = runtimeEnvSchema.extend({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api"),
  NEXT_PUBLIC_STOREFRONT_URL: z.string().url().default("http://localhost:3000")
});

export const adminEnvSchema = runtimeEnvSchema.extend({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api"),
  NEXT_PUBLIC_ADMIN_URL: z.string().url().default("http://localhost:3001")
});

export function createEnv<TSchema extends z.ZodTypeAny>(
  schema: TSchema,
  input: unknown
): z.infer<TSchema> {
  return schema.parse(input);
}
