export const userRoles = ["CUSTOMER", "ADMIN", "SELLER"] as const;
export type UserRole = (typeof userRoles)[number];

export const productStatuses = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof productStatuses)[number];

export const inventoryReservationStatuses = [
  "ACTIVE",
  "RELEASED",
  "CONSUMED",
  "EXPIRED"
] as const;
export type InventoryReservationStatus =
  (typeof inventoryReservationStatuses)[number];

export const cartStatuses = ["ACTIVE", "CONVERTED", "ABANDONED"] as const;
export type CartStatus = (typeof cartStatuses)[number];

export const checkoutStatuses = [
  "STARTED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "FAILED",
  "EXPIRED"
] as const;
export type CheckoutStatus = (typeof checkoutStatuses)[number];

export const paymentStatuses = [
  "PENDING",
  "REQUIRES_ACTION",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED"
] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const orderStatuses = [
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELED",
  "REFUNDED"
] as const;
export type OrderStatus = (typeof orderStatuses)[number];

export const promotionTypes = [
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "CART_THRESHOLD",
  "CATEGORY_DISCOUNT",
  "BUY_X_GET_Y"
] as const;
export type PromotionType = (typeof promotionTypes)[number];

export const promotionStackingModes = ["STACKABLE", "EXCLUSIVE"] as const;
export type PromotionStackingMode =
  (typeof promotionStackingModes)[number];

export const promotionFundingSources = [
  "PLATFORM",
  "SELLER",
  "SHARED"
] as const;
export type PromotionFundingSource =
  (typeof promotionFundingSources)[number];

export const sellerStatuses = ["PENDING", "ACTIVE", "SUSPENDED"] as const;
export type SellerStatus = (typeof sellerStatuses)[number];

export const sellerApplicationStatuses = [
  "SUBMITTED",
  "REVIEWING",
  "ACTIVATION_PENDING",
  "ACTIVATED",
  "REJECTED"
] as const;
export type SellerApplicationStatus =
  (typeof sellerApplicationStatuses)[number];

export const notificationKinds = [
  "ACCOUNT",
  "ORDER",
  "PAYMENT",
  "REFUND",
  "SELLER_APPLICATION",
  "OPERATIONS"
] as const;
export type NotificationKind = (typeof notificationKinds)[number];

export const notificationLevels = [
  "INFO",
  "SUCCESS",
  "WARNING",
  "ACTION_REQUIRED"
] as const;
export type NotificationLevel = (typeof notificationLevels)[number];

export interface Money {
  amount: number;
  currency: "RON" | "EUR";
}

export interface DemoAccount {
  email: string;
  password: string;
  role: UserRole;
}

export interface CategoryPreview {
  slug: string;
  title: string;
  description: string;
}

export interface PlatformSurface {
  name: string;
  description: string;
}
