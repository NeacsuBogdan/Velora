import { createHash, randomBytes } from "node:crypto";
import type { AuthenticatedUser } from "@velora/contracts";

export const GUEST_CART_TOKEN_HEADER = "x-velora-guest-cart-token";

export interface CommerceContext {
  user: AuthenticatedUser | null;
  guestCartToken: string | null;
}

export function createGuestCartToken(): string {
  return randomBytes(32).toString("hex");
}

export function hashGuestCartToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

