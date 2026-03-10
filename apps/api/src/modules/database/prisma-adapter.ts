import { PrismaPg } from "@prisma/adapter-pg";

export const DEFAULT_DATABASE_URL =
  "postgresql://velora:velora@localhost:5433/velora";

export function createPrismaAdapter(): PrismaPg {
  return new PrismaPg({
    connectionString: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL
  });
}
