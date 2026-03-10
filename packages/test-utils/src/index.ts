import type { DemoAccount } from "@velora/domain";

export const demoAccounts: DemoAccount[] = [
  {
    email: "admin@velora.local",
    password: "Demo123!",
    role: "ADMIN"
  },
  {
    email: "seller@velora.local",
    password: "Demo123!",
    role: "SELLER"
  },
  {
    email: "customer@velora.local",
    password: "Demo123!",
    role: "CUSTOMER"
  }
];

export function createDeterministicSku(seed: number): string {
  return `VEL-${seed.toString().padStart(6, "0")}`;
}
