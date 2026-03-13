export const rateLimitPresets = [
  "AUTH_LOGIN",
  "CART_COUPON",
  "CHECKOUT_CREATE",
  "PAYMENT_ATTEMPT_CREATE",
  "PAYMENT_ATTEMPT_CONFIRM"
] as const;

export type RateLimitPreset = (typeof rateLimitPresets)[number];

export interface RateLimitPresetConfig {
  identity: "ip" | "viewer_or_ip";
  limit: number;
  windowSeconds: number;
}
