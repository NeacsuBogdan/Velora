import {
  notificationKinds,
  notificationLevels,
  productStatuses,
  sellerApplicationStatuses,
  sellerStatuses,
  userRoles
} from "@velora/domain";
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

export const registerRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().email(),
  password: z.string().min(8)
});

export type RegisterRequest = z.infer<typeof registerRequestSchema>;

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

export const addressTypeSchema = z.enum(["SHIPPING", "BILLING"]);
export type AddressType = z.infer<typeof addressTypeSchema>;

export const addressSummarySchema = z.object({
  addressId: z.string(),
  type: addressTypeSchema,
  label: z.string(),
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  postalCode: z.string(),
  countryCode: z.string().length(2),
  phone: z.string().nullable(),
  isDefault: z.boolean(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AddressSummary = z.infer<typeof addressSummarySchema>;

export const checkoutContactInputSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6).max(32).optional()
});

export type CheckoutContactInput = z.infer<typeof checkoutContactInputSchema>;

export const checkoutContactSummarySchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
  email: z.string().email(),
  phone: z.string().nullable()
});

export type CheckoutContactSummary = z.infer<
  typeof checkoutContactSummarySchema
>;

export const checkoutAddressInputSchema = z.object({
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().min(1).max(24),
  countryCode: z
    .string()
    .trim()
    .length(2)
    .transform((value) => value.toUpperCase()),
  phone: z.string().trim().max(32).optional()
});

export type CheckoutAddressInput = z.infer<typeof checkoutAddressInputSchema>;

export const checkoutAddressSummarySchema = z.object({
  fullName: z.string(),
  line1: z.string(),
  line2: z.string().nullable(),
  city: z.string(),
  state: z.string().nullable(),
  postalCode: z.string(),
  countryCode: z.string().length(2),
  phone: z.string().nullable()
});

export type CheckoutAddressSummary = z.infer<
  typeof checkoutAddressSummarySchema
>;

export const customerProfileSchema = authenticatedUserSchema.extend({
  defaultShippingAddress: addressSummarySchema.nullable(),
  defaultBillingAddress: addressSummarySchema.nullable(),
  metrics: z.object({
    addressCount: z.number().int().nonnegative(),
    orderCount: z.number().int().nonnegative()
  })
});

export type CustomerProfile = z.infer<typeof customerProfileSchema>;

export const updateProfileRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80)
});

export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;

export const sellerApplicationStatusSchema = z.enum(sellerApplicationStatuses);
export type SellerApplicationStatus = z.infer<
  typeof sellerApplicationStatusSchema
>;

export const createSellerApplicationRequestSchema = z.object({
  displayName: z.string().trim().min(3).max(120),
  legalName: z.string().trim().min(3).max(160),
  contactFirstName: z.string().trim().min(1).max(80),
  contactLastName: z.string().trim().min(1).max(80),
  contactEmail: z.string().trim().email(),
  contactPhone: z.string().trim().min(6).max(32).optional(),
  websiteUrl: z.string().trim().url().optional(),
  catalogSummary: z.string().trim().min(24).max(600),
  notes: z.string().trim().max(400).optional()
});

export type CreateSellerApplicationRequest = z.infer<
  typeof createSellerApplicationRequestSchema
>;

export const sellerApplicationReceiptSchema = z.object({
  applicationId: z.string(),
  status: sellerApplicationStatusSchema,
  submittedAt: z.string().datetime(),
  message: z.string()
});

export type SellerApplicationReceipt = z.infer<
  typeof sellerApplicationReceiptSchema
>;

export const sellerActivationPreviewSchema = z.object({
  applicationId: z.string(),
  displayName: z.string(),
  legalName: z.string(),
  contactEmail: z.string().email(),
  contactName: z.string(),
  status: sellerApplicationStatusSchema,
  expiresAt: z.string().datetime(),
  catalogSummary: z.string()
});

export type SellerActivationPreview = z.infer<
  typeof sellerActivationPreviewSchema
>;

export const completeSellerActivationRequestSchema = z.object({
  firstName: z.string().trim().min(1).max(80),
  lastName: z.string().trim().min(1).max(80),
  password: z.string().min(8)
});

export type CompleteSellerActivationRequest = z.infer<
  typeof completeSellerActivationRequestSchema
>;

export const sellerActivationResponseSchema = z.object({
  sellerSlug: z.string(),
  session: sessionResponseSchema
});

export type SellerActivationResponse = z.infer<
  typeof sellerActivationResponseSchema
>;

export const notificationKindSchema = z.enum(notificationKinds);
export type NotificationKind = z.infer<typeof notificationKindSchema>;

export const notificationLevelSchema = z.enum(notificationLevels);
export type NotificationLevel = z.infer<typeof notificationLevelSchema>;

export const notificationSummarySchema = z.object({
  notificationId: z.string(),
  title: z.string(),
  message: z.string(),
  kind: notificationKindSchema,
  level: notificationLevelSchema,
  linkUrl: z.string().nullable(),
  isRead: z.boolean(),
  createdAt: z.string().datetime(),
  readAt: z.string().datetime().nullable()
});

export type NotificationSummary = z.infer<typeof notificationSummarySchema>;

export const notificationFeedSchema = z.object({
  unreadCount: z.number().int().nonnegative(),
  items: z.array(notificationSummarySchema)
});

export type NotificationFeed = z.infer<typeof notificationFeedSchema>;

export const markNotificationReadResponseSchema = z.object({
  notificationId: z.string(),
  unreadCount: z.number().int().nonnegative()
});

export type MarkNotificationReadResponse = z.infer<
  typeof markNotificationReadResponseSchema
>;

export const markAllNotificationsReadResponseSchema = z.object({
  markedCount: z.number().int().nonnegative(),
  unreadCount: z.number().int().nonnegative()
});

export type MarkAllNotificationsReadResponse = z.infer<
  typeof markAllNotificationsReadResponseSchema
>;

export const upsertAddressRequestSchema = z.object({
  type: addressTypeSchema,
  label: z.string().trim().min(1).max(80),
  fullName: z.string().trim().min(1).max(120),
  line1: z.string().trim().min(1).max(120),
  line2: z.string().trim().max(120).optional(),
  city: z.string().trim().min(1).max(80),
  state: z.string().trim().max(80).optional(),
  postalCode: z.string().trim().min(1).max(24),
  countryCode: z.string().trim().length(2).transform((value) => value.toUpperCase()),
  phone: z.string().trim().max(32).optional(),
  isDefault: z.boolean().default(false)
});

export type UpsertAddressRequest = z.infer<typeof upsertAddressRequestSchema>;

export const deleteAddressResponseSchema = z.object({
  deletedAddressId: z.string()
});

export type DeleteAddressResponse = z.infer<
  typeof deleteAddressResponseSchema
>;

export const domainOverviewSchema = z.object({
  scope: z.string(),
  metrics: z.record(z.string(), z.number()),
  notes: z.array(z.string())
});

export type DomainOverview = z.infer<typeof domainOverviewSchema>;

export const moneySchema = z.object({
  amount: z.number().int().nonnegative(),
  currency: z.string().length(3)
});

export type Money = z.infer<typeof moneySchema>;

export const breadcrumbSchema = z.object({
  slug: z.string(),
  name: z.string()
});

export type Breadcrumb = z.infer<typeof breadcrumbSchema>;

export const mediaAssetSchema = z.object({
  url: z.string().url(),
  altText: z.string()
});

export type MediaAsset = z.infer<typeof mediaAssetSchema>;

export const catalogSortOptions = [
  "relevance",
  "newest",
  "price_asc",
  "price_desc"
] as const;

export const catalogSortSchema = z.enum(catalogSortOptions);
export type CatalogSort = z.infer<typeof catalogSortSchema>;

export const availabilityFilterOptions = ["all", "in_stock"] as const;

export const availabilityFilterSchema = z.enum(availabilityFilterOptions);
export type AvailabilityFilter = z.infer<typeof availabilityFilterSchema>;

export const sortOptionSchema = z.object({
  value: catalogSortSchema,
  label: z.string()
});

export type SortOption = z.infer<typeof sortOptionSchema>;

export const priceSummarySchema = z.object({
  current: moneySchema,
  compareAt: moneySchema.nullable(),
  discountPercentage: z.number().int().nonnegative().nullable()
});

export type PriceSummary = z.infer<typeof priceSummarySchema>;

export const availabilitySummarySchema = z.object({
  inStock: z.boolean(),
  availableQuantity: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().positive()
});

export type AvailabilitySummary = z.infer<
  typeof availabilitySummarySchema
>;

export const productStatusSchema = z.enum(productStatuses);
export type ProductStatus = z.infer<typeof productStatusSchema>;

export const sellerStatusSchema = z.enum(sellerStatuses);
export type SellerStatus = z.infer<typeof sellerStatusSchema>;

export const namedReferenceSchema = z.object({
  slug: z.string(),
  name: z.string()
});

export type NamedReference = z.infer<typeof namedReferenceSchema>;

export const productListItemSchema = z.object({
  listingId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  description: z.string(),
  seller: namedReferenceSchema,
  brand: namedReferenceSchema.nullable(),
  category: z
    .object({
      slug: z.string(),
      name: z.string(),
      path: z.array(breadcrumbSchema)
    })
    .nullable(),
  pricing: priceSummarySchema,
  availability: availabilitySummarySchema,
  image: mediaAssetSchema.nullable(),
  highlights: z.array(z.string())
});

export type ProductListItem = z.infer<typeof productListItemSchema>;

export const catalogFacetOptionSchema = z.object({
  value: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative(),
  selected: z.boolean()
});

export type CatalogFacetOption = z.infer<
  typeof catalogFacetOptionSchema
>;

export const catalogFiltersSchema = z.object({
  query: z.string(),
  category: z.string().nullable(),
  brands: z.array(z.string()),
  minPrice: z.number().int().nonnegative().nullable(),
  maxPrice: z.number().int().nonnegative().nullable(),
  availability: availabilityFilterSchema,
  sort: catalogSortSchema
});

export type CatalogFilters = z.infer<typeof catalogFiltersSchema>;

export const paginationMetaSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  totalItems: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative()
});

export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export const categorySummarySchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  productCount: z.number().int().nonnegative()
});

export type CategorySummary = z.infer<typeof categorySummarySchema>;

export const categoryTreeNodeSchema = categorySummarySchema.extend({
  children: z.array(categorySummarySchema)
});

export type CategoryTreeNode = z.infer<typeof categoryTreeNodeSchema>;

export const catalogNavigationSchema = z.object({
  categories: z.array(categoryTreeNodeSchema),
  featuredCategories: z.array(categorySummarySchema)
});

export type CatalogNavigation = z.infer<
  typeof catalogNavigationSchema
>;

export const categoryDetailSchema = z.object({
  slug: z.string(),
  name: z.string(),
  description: z.string(),
  breadcrumbs: z.array(breadcrumbSchema),
  childCategories: z.array(categorySummarySchema),
  metrics: z.object({
    products: z.number().int().nonnegative(),
    brands: z.number().int().nonnegative(),
    sellers: z.number().int().nonnegative()
  })
});

export type CategoryDetail = z.infer<typeof categoryDetailSchema>;

export const catalogSearchResponseSchema = z.object({
  source: z.enum(["opensearch", "fallback"]),
  query: z.string(),
  availableSorts: z.array(sortOptionSchema),
  appliedFilters: catalogFiltersSchema,
  pagination: paginationMetaSchema,
  items: z.array(productListItemSchema),
  facets: z.object({
    brands: z.array(catalogFacetOptionSchema),
    categories: z.array(catalogFacetOptionSchema),
    availability: z.array(catalogFacetOptionSchema),
    priceRange: z.object({
      min: z.number().int().nonnegative().nullable(),
      max: z.number().int().nonnegative().nullable()
    })
  })
});

export type CatalogSearchResponse = z.infer<
  typeof catalogSearchResponseSchema
>;

export const productVariantSummarySchema = z.object({
  id: z.string(),
  sku: z.string(),
  title: z.string(),
  isDefault: z.boolean(),
  attributes: z.array(
    z.object({
      name: z.string(),
      value: z.string()
    })
  )
});

export type ProductVariantSummary = z.infer<
  typeof productVariantSummarySchema
>;

export const productOfferSchema = z.object({
  listingId: z.string(),
  seller: namedReferenceSchema,
  pricing: priceSummarySchema,
  availability: availabilitySummarySchema,
  sellerSku: z.string()
});

export type ProductOffer = z.infer<typeof productOfferSchema>;

export const productSpecificationGroupSchema = z.object({
  title: z.string(),
  items: z.array(
    z.object({
      label: z.string(),
      value: z.string()
    })
  )
});

export type ProductSpecificationGroup = z.infer<
  typeof productSpecificationGroupSchema
>;

export const productDetailSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string(),
  brand: namedReferenceSchema.nullable(),
  category: z
    .object({
      slug: z.string(),
      name: z.string()
    })
    .nullable(),
  breadcrumbs: z.array(breadcrumbSchema),
  gallery: z.array(mediaAssetSchema),
  highlights: z.array(
    z.object({
      name: z.string(),
      value: z.string()
    })
  ),
  variants: z.array(productVariantSummarySchema),
  offers: z.array(productOfferSchema),
  specifications: z.array(productSpecificationGroupSchema),
  relatedProducts: z.array(productListItemSchema)
});

export type ProductDetail = z.infer<typeof productDetailSchema>;

export const addCartItemRequestSchema = z.object({
  listingId: z.string().cuid(),
  quantity: z.number().int().positive().max(99)
});

export type AddCartItemRequest = z.infer<typeof addCartItemRequestSchema>;

export const updateCartItemRequestSchema = z.object({
  quantity: z.number().int().min(0).max(99)
});

export type UpdateCartItemRequest = z.infer<typeof updateCartItemRequestSchema>;

export const checkoutStatusSchema = z.enum([
  "STARTED",
  "PAYMENT_PENDING",
  "COMPLETED",
  "FAILED",
  "EXPIRED"
]);

export type CheckoutStatus = z.infer<typeof checkoutStatusSchema>;

export const promotionTypeSchema = z.enum([
  "PERCENTAGE",
  "FIXED_AMOUNT",
  "CART_THRESHOLD",
  "CATEGORY_DISCOUNT",
  "BUY_X_GET_Y"
]);

export type PromotionType = z.infer<typeof promotionTypeSchema>;

export const promotionStackingModeSchema = z.enum([
  "STACKABLE",
  "EXCLUSIVE"
]);

export type PromotionStackingMode = z.infer<
  typeof promotionStackingModeSchema
>;

export const couponStatusSchema = z.enum([
  "ACTIVE",
  "DISABLED",
  "EXPIRED"
]);

export type CouponStatus = z.infer<typeof couponStatusSchema>;

export const paymentStatusSchema = z.enum([
  "PENDING",
  "REQUIRES_ACTION",
  "SUCCEEDED",
  "FAILED",
  "REFUNDED",
  "PARTIALLY_REFUNDED"
]);

export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const orderStatusSchema = z.enum([
  "CREATED",
  "PAYMENT_PENDING",
  "PAID",
  "PROCESSING",
  "SHIPPED",
  "COMPLETED",
  "CANCELED",
  "REFUNDED"
]);

export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const createCheckoutSessionRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(120).optional(),
  customer: checkoutContactInputSchema,
  deliveryAddress: checkoutAddressInputSchema
});

export type CreateCheckoutSessionRequest = z.infer<
  typeof createCheckoutSessionRequestSchema
>;

export const promotionRuleConfigurationSchema = z.object({
  percentage: z.number().positive().max(100).optional(),
  amount: z.number().int().positive().optional(),
  thresholdAmount: z.number().int().nonnegative().optional(),
  categorySlugs: z.array(z.string().min(1)).optional(),
  listingIds: z.array(z.string().min(1)).optional(),
  buyQuantity: z.number().int().positive().optional(),
  getQuantity: z.number().int().positive().optional()
});

export type PromotionRuleConfiguration = z.infer<
  typeof promotionRuleConfigurationSchema
>;

export const appliedDiscountSummarySchema = z.object({
  promotionId: z.string().nullable(),
  couponCode: z.string().nullable(),
  label: z.string(),
  amount: moneySchema,
  description: z.string().nullable()
});

export type AppliedDiscountSummary = z.infer<
  typeof appliedDiscountSummarySchema
>;

export const applyCouponRequestSchema = z.object({
  couponCode: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/)
});

export type ApplyCouponRequest = z.infer<typeof applyCouponRequestSchema>;

export const promotionRuleSummarySchema = z.object({
  ruleId: z.string(),
  name: z.string(),
  configuration: promotionRuleConfigurationSchema
});

export type PromotionRuleSummary = z.infer<
  typeof promotionRuleSummarySchema
>;

export const couponSummarySchema = z.object({
  couponId: z.string(),
  code: z.string(),
  status: couponStatusSchema,
  usageLimit: z.number().int().positive().nullable(),
  usedCount: z.number().int().nonnegative(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable()
});

export type CouponSummary = z.infer<typeof couponSummarySchema>;

export const promotionSummarySchema = z.object({
  promotionId: z.string(),
  name: z.string(),
  code: z.string().nullable(),
  description: z.string(),
  type: promotionTypeSchema,
  stackingMode: promotionStackingModeSchema,
  priority: z.number().int(),
  isActive: z.boolean(),
  startsAt: z.string().datetime().nullable(),
  endsAt: z.string().datetime().nullable(),
  rules: z.array(promotionRuleSummarySchema),
  coupons: z.array(couponSummarySchema),
  updatedAt: z.string().datetime()
});

export type PromotionSummary = z.infer<typeof promotionSummarySchema>;

export const upsertPromotionRequestSchema = z.object({
  name: z.string().min(3).max(120),
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Z0-9_-]+$/)
    .nullable()
    .optional(),
  description: z.string().min(8).max(400),
  type: promotionTypeSchema,
  stackingMode: promotionStackingModeSchema,
  priority: z.number().int().min(0).max(1000),
  isActive: z.boolean().default(true),
  startsAt: z.string().datetime().nullable().optional(),
  endsAt: z.string().datetime().nullable().optional(),
  rule: z.object({
    name: z.string().min(3).max(120),
    configuration: promotionRuleConfigurationSchema
  }),
  coupons: z
    .array(
      z.object({
        code: z
          .string()
          .trim()
          .min(3)
          .max(40)
          .regex(/^[A-Z0-9_-]+$/),
        status: couponStatusSchema.default("ACTIVE"),
        usageLimit: z.number().int().positive().nullable().optional(),
        startsAt: z.string().datetime().nullable().optional(),
        endsAt: z.string().datetime().nullable().optional()
      })
    )
    .default([])
});

export type UpsertPromotionRequest = z.infer<
  typeof upsertPromotionRequestSchema
>;

export const cartItemDetailSchema = z.object({
  itemId: z.string(),
  listingId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  seller: namedReferenceSchema,
  quantity: z.number().int().positive(),
  image: mediaAssetSchema.nullable(),
  availability: availabilitySummarySchema,
  pricing: z.object({
    unit: moneySchema,
    lineTotal: moneySchema
  }),
  canFulfill: z.boolean()
});

export type CartItemDetail = z.infer<typeof cartItemDetailSchema>;

export const checkoutReservationSummarySchema = z.object({
  checkoutSessionId: z.string(),
  status: checkoutStatusSchema,
  amount: moneySchema,
  reservationExpiresAt: z.string().datetime(),
  reservationCount: z.number().int().nonnegative(),
  reservedUnits: z.number().int().nonnegative()
});

export type CheckoutReservationSummary = z.infer<
  typeof checkoutReservationSummarySchema
>;

export const checkoutReservationLineSchema = z.object({
  reservationId: z.string(),
  listingId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  subtitle: z.string().nullable(),
  seller: namedReferenceSchema,
  quantity: z.number().int().positive(),
  expiresAt: z.string().datetime()
});

export type CheckoutReservationLine = z.infer<
  typeof checkoutReservationLineSchema
>;

export const cartDetailSchema = z.object({
  cartId: z.string(),
  status: z.enum(["ACTIVE", "CONVERTED", "ABANDONED"]),
  currency: z.string().length(3),
  couponCode: z.string().nullable(),
  itemCount: z.number().int().nonnegative(),
  totals: z.object({
    subtotal: moneySchema,
    discountTotal: moneySchema,
    total: moneySchema
  }),
  items: z.array(cartItemDetailSchema),
  discounts: z.array(appliedDiscountSummarySchema),
  activeCheckout: checkoutReservationSummarySchema.nullable(),
  notes: z.array(z.string())
});

export type CartDetail = z.infer<typeof cartDetailSchema>;

export const checkoutSessionResponseSchema = z.object({
  checkoutSessionId: z.string(),
  cartId: z.string(),
  status: checkoutStatusSchema,
  amount: moneySchema,
  reservationExpiresAt: z.string().datetime(),
  reservationCount: z.number().int().nonnegative()
});

export type CheckoutSessionResponse = z.infer<
  typeof checkoutSessionResponseSchema
>;

export const paymentScenarioSchema = z.enum([
  "success",
  "declined",
  "requires_action"
]);

export type PaymentScenario = z.infer<typeof paymentScenarioSchema>;

export const createPaymentAttemptRequestSchema = z.object({
  idempotencyKey: z.string().min(8).max(120).optional()
});

export type CreatePaymentAttemptRequest = z.infer<
  typeof createPaymentAttemptRequestSchema
>;

export const confirmPaymentAttemptRequestSchema = z.object({
  scenario: paymentScenarioSchema.default("success")
});

export type ConfirmPaymentAttemptRequest = z.infer<
  typeof confirmPaymentAttemptRequestSchema
>;

export const paymentAttemptSummarySchema = z.object({
  attemptId: z.string(),
  checkoutSessionId: z.string(),
  provider: z.string(),
  providerPaymentIntentId: z.string().nullable(),
  clientSecret: z.string().nullable(),
  status: paymentStatusSchema,
  amount: moneySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type PaymentAttemptSummary = z.infer<
  typeof paymentAttemptSummarySchema
>;

export const orderSummarySchema = z.object({
  orderId: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  total: moneySchema,
  subtotal: moneySchema,
  discountTotal: moneySchema,
  itemCount: z.number().int().nonnegative(),
  createdAt: z.string().datetime(),
  placedAt: z.string().datetime().nullable()
});

export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const checkoutSessionDetailSchema = z.object({
  checkoutSessionId: z.string(),
  cartId: z.string(),
  checkoutMode: z.enum(["authenticated", "guest"]),
  status: checkoutStatusSchema,
  amount: moneySchema,
  customer: checkoutContactSummarySchema.nullable(),
  deliveryAddress: checkoutAddressSummarySchema.nullable(),
  reservationExpiresAt: z.string().datetime().nullable(),
  reservations: z.array(checkoutReservationLineSchema),
  discounts: z.array(appliedDiscountSummarySchema),
  paymentAttempts: z.array(paymentAttemptSummarySchema),
  order: orderSummarySchema.nullable()
});

export type CheckoutSessionDetail = z.infer<
  typeof checkoutSessionDetailSchema
>;

export const refundRequestSchema = z.object({
  amount: z.number().int().positive().optional(),
  reason: z.string().max(240).optional()
});

export type RefundRequest = z.infer<typeof refundRequestSchema>;

export const refundSummarySchema = z.object({
  refundId: z.string(),
  amount: moneySchema,
  status: paymentStatusSchema,
  reason: z.string().nullable(),
  createdAt: z.string().datetime()
});

export type RefundSummary = z.infer<typeof refundSummarySchema>;

export const orderItemDetailSchema = z.object({
  orderItemId: z.string(),
  listingId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  seller: namedReferenceSchema,
  quantity: z.number().int().positive(),
  unitPrice: moneySchema,
  totalPrice: moneySchema
});

export type OrderItemDetail = z.infer<typeof orderItemDetailSchema>;

export const orderStatusHistoryEntrySchema = z.object({
  status: orderStatusSchema,
  note: z.string().nullable(),
  createdAt: z.string().datetime()
});

export type OrderStatusHistoryEntry = z.infer<
  typeof orderStatusHistoryEntrySchema
>;

export const orderDetailSchema = orderSummarySchema.extend({
  customer: checkoutContactSummarySchema.nullable(),
  deliveryAddress: checkoutAddressSummarySchema.nullable(),
  items: z.array(orderItemDetailSchema),
  discounts: z.array(appliedDiscountSummarySchema),
  statusHistory: z.array(orderStatusHistoryEntrySchema),
  refunds: z.array(refundSummarySchema)
});

export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const paymentConfirmationResponseSchema = z.object({
  attempt: paymentAttemptSummarySchema,
  checkout: checkoutSessionDetailSchema,
  order: orderSummarySchema.nullable(),
  message: z.string()
});

export type PaymentConfirmationResponse = z.infer<
  typeof paymentConfirmationResponseSchema
>;

export const webhookAckSchema = z.object({
  provider: z.string(),
  eventId: z.string(),
  duplicate: z.boolean(),
  processed: z.boolean()
});

export type WebhookAck = z.infer<typeof webhookAckSchema>;

export const releaseReservationsResponseSchema = z.object({
  releasedReservations: z.number().int().nonnegative(),
  inventoryItemsAdjusted: z.number().int().nonnegative()
});

export type ReleaseReservationsResponse = z.infer<
  typeof releaseReservationsResponseSchema
>;

export const adminDashboardSchema = z.object({
  generatedAt: z.string().datetime(),
  metrics: z.object({
    categories: z.number().int().nonnegative(),
    products: z.number().int().nonnegative(),
    activeListings: z.number().int().nonnegative(),
    lowStockListings: z.number().int().nonnegative(),
    pendingOrders: z.number().int().nonnegative(),
    customers: z.number().int().nonnegative(),
    sellers: z.number().int().nonnegative(),
    activePromotions: z.number().int().nonnegative(),
    openCheckouts: z.number().int().nonnegative()
  }),
  notes: z.array(z.string())
});

export type AdminDashboard = z.infer<typeof adminDashboardSchema>;

export const adminCategorySummarySchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  description: z.string(),
  parentId: z.string().nullable(),
  parentName: z.string().nullable(),
  sortOrder: z.number().int().nonnegative(),
  isActive: z.boolean(),
  productCount: z.number().int().nonnegative(),
  childCount: z.number().int().nonnegative(),
  updatedAt: z.string().datetime()
});

export type AdminCategorySummary = z.infer<
  typeof adminCategorySummarySchema
>;

export const upsertAdminCategoryRequestSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(8).max(240),
  parentId: z.string().cuid().nullable().optional(),
  sortOrder: z.number().int().min(0).max(10_000),
  isActive: z.boolean().default(true)
});

export type UpsertAdminCategoryRequest = z.infer<
  typeof upsertAdminCategoryRequestSchema
>;

export const adminCatalogOptionsSchema = z.object({
  categories: z.array(
    z.object({
      categoryId: z.string(),
      name: z.string(),
      slug: z.string(),
      parentId: z.string().nullable(),
      isActive: z.boolean()
    })
  ),
  brands: z.array(
    z.object({
      brandId: z.string(),
      name: z.string(),
      slug: z.string()
    })
  ),
  sellers: z.array(
    z.object({
      sellerId: z.string(),
      displayName: z.string(),
      status: sellerStatusSchema
    })
  )
});

export type AdminCatalogOptions = z.infer<
  typeof adminCatalogOptionsSchema
>;

export const adminProductSummarySchema = z.object({
  productId: z.string(),
  listingId: z.string().nullable(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  status: productStatusSchema,
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  sellerId: z.string().nullable(),
  sellerName: z.string().nullable(),
  sellerSku: z.string().nullable(),
  variantTitle: z.string().nullable(),
  leadTimeDays: z.number().int().positive().nullable(),
  price: moneySchema.nullable(),
  compareAtPrice: moneySchema.nullable(),
  inventory: z
    .object({
      onHand: z.number().int().nonnegative(),
      reserved: z.number().int().nonnegative(),
      safetyStock: z.number().int().nonnegative(),
      availableQuantity: z.number().int().nonnegative()
    })
    .nullable(),
  listingCount: z.number().int().nonnegative(),
  image: mediaAssetSchema.nullable(),
  updatedAt: z.string().datetime()
});

export type AdminProductSummary = z.infer<
  typeof adminProductSummarySchema
>;

export const upsertAdminProductRequestSchema = z
  .object({
    listingId: z.string().cuid().nullable().optional(),
    title: z.string().trim().min(3).max(160),
    slug: z
      .string()
      .trim()
      .min(3)
      .max(160)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().trim().min(16).max(4_000),
    status: productStatusSchema,
    categoryId: z.string().cuid().nullable().optional(),
    brandName: z.string().trim().max(80).nullable().optional(),
    sellerId: z.string().cuid(),
    sellerSku: z.string().trim().min(3).max(120),
    variantTitle: z.string().trim().max(120).nullable().optional(),
    leadTimeDays: z.number().int().min(1).max(30),
    priceAmount: z.number().int().nonnegative(),
    compareAtAmount: z.number().int().nonnegative().nullable().optional(),
    onHand: z.number().int().nonnegative(),
    safetyStock: z.number().int().nonnegative(),
    imageUrl: z.string().url().nullable().optional(),
    imageAlt: z.string().trim().max(160).nullable().optional()
  })
  .superRefine((value, context) => {
    if (
      value.compareAtAmount !== null &&
      value.compareAtAmount !== undefined &&
      value.compareAtAmount < value.priceAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["compareAtAmount"],
        message: "Compare-at amount must be greater than or equal to the current price."
      });
    }
  });

export type UpsertAdminProductRequest = z.infer<
  typeof upsertAdminProductRequestSchema
>;

export const adminInventoryItemSchema = z.object({
  inventoryItemId: z.string(),
  listingId: z.string(),
  productId: z.string(),
  productTitle: z.string(),
  productSlug: z.string(),
  sellerId: z.string(),
  sellerName: z.string(),
  sellerSku: z.string(),
  status: productStatusSchema,
  onHand: z.number().int().nonnegative(),
  reserved: z.number().int().nonnegative(),
  safetyStock: z.number().int().nonnegative(),
  availableQuantity: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().positive(),
  updatedAt: z.string().datetime()
});

export type AdminInventoryItem = z.infer<
  typeof adminInventoryItemSchema
>;

export const updateAdminInventoryRequestSchema = z.object({
  onHand: z.number().int().nonnegative(),
  safetyStock: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().min(1).max(30),
  note: z.string().trim().max(240).nullable().optional()
});

export type UpdateAdminInventoryRequest = z.infer<
  typeof updateAdminInventoryRequestSchema
>;

export const adminOrderPartySchema = z.object({
  id: z.string(),
  label: z.string()
});

export type AdminOrderParty = z.infer<typeof adminOrderPartySchema>;

export const adminOrderSummarySchema = z.object({
  orderId: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  total: moneySchema,
  itemCount: z.number().int().nonnegative(),
  customer: adminOrderPartySchema.nullable(),
  seller: adminOrderPartySchema.nullable(),
  createdAt: z.string().datetime(),
  placedAt: z.string().datetime().nullable(),
  updatedAt: z.string().datetime()
});

export type AdminOrderSummary = z.infer<
  typeof adminOrderSummarySchema
>;

export const adminOrderDetailSchema = adminOrderSummarySchema.extend({
  subtotal: moneySchema,
  discountTotal: moneySchema,
  customerContact: checkoutContactSummarySchema.nullable(),
  deliveryAddress: checkoutAddressSummarySchema.nullable(),
  items: z.array(orderItemDetailSchema),
  discounts: z.array(appliedDiscountSummarySchema),
  statusHistory: z.array(orderStatusHistoryEntrySchema),
  refunds: z.array(refundSummarySchema)
});

export type AdminOrderDetail = z.infer<typeof adminOrderDetailSchema>;

export const updateAdminOrderStatusRequestSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(240).nullable().optional()
});

export type UpdateAdminOrderStatusRequest = z.infer<
  typeof updateAdminOrderStatusRequestSchema
>;

export const adminCustomerSummarySchema = z.object({
  userId: z.string(),
  email: z.string().email(),
  fullName: z.string(),
  isActive: z.boolean(),
  roles: z.array(z.enum(userRoles)),
  orderCount: z.number().int().nonnegative(),
  totalSpent: moneySchema,
  lastOrderAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime()
});

export type AdminCustomerSummary = z.infer<
  typeof adminCustomerSummarySchema
>;

export const adminSellerSummarySchema = z.object({
  sellerId: z.string(),
  slug: z.string(),
  displayName: z.string(),
  legalName: z.string(),
  contactEmail: z.string().email(),
  status: sellerStatusSchema,
  ownerUserEmail: z.string().email().nullable(),
  listingCount: z.number().int().nonnegative(),
  activeListings: z.number().int().nonnegative(),
  lowStockListings: z.number().int().nonnegative(),
  updatedAt: z.string().datetime()
});

export type AdminSellerSummary = z.infer<
  typeof adminSellerSummarySchema
>;

export const adminSellerApplicationSummarySchema = z.object({
  applicationId: z.string(),
  displayName: z.string(),
  legalName: z.string(),
  contactName: z.string(),
  contactEmail: z.string().email(),
  contactPhone: z.string().nullable(),
  websiteUrl: z.string().url().nullable(),
  catalogSummary: z.string(),
  notes: z.string().nullable(),
  status: sellerApplicationStatusSchema,
  reviewNote: z.string().nullable(),
  reviewedByEmail: z.string().email().nullable(),
  reviewedAt: z.string().datetime().nullable(),
  activationExpiresAt: z.string().datetime().nullable(),
  activatedAt: z.string().datetime().nullable(),
  sellerId: z.string().nullable(),
  sellerDisplayName: z.string().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime()
});

export type AdminSellerApplicationSummary = z.infer<
  typeof adminSellerApplicationSummarySchema
>;

export const reviewAdminSellerApplicationRequestSchema = z.object({
  decision: z.enum(["REVIEWING", "APPROVE", "REJECT"]),
  note: z.string().trim().max(240).optional(),
  activationWindowDays: z.number().int().min(1).max(14).optional()
});

export type ReviewAdminSellerApplicationRequest = z.infer<
  typeof reviewAdminSellerApplicationRequestSchema
>;

export const reviewAdminSellerApplicationResponseSchema =
  adminSellerApplicationSummarySchema.extend({
    activationLink: z.string().url().nullable()
  });

export type ReviewAdminSellerApplicationResponse = z.infer<
  typeof reviewAdminSellerApplicationResponseSchema
>;

export const updateAdminSellerRequestSchema = z.object({
  displayName: z.string().trim().min(3).max(120),
  legalName: z.string().trim().min(3).max(160),
  contactEmail: z.string().trim().email(),
  status: sellerStatusSchema
});

export type UpdateAdminSellerRequest = z.infer<
  typeof updateAdminSellerRequestSchema
>;

export const adminReindexJobSummarySchema = z.object({
  jobId: z.string(),
  scope: z.string(),
  status: z.enum(["PENDING", "RUNNING", "SUCCEEDED", "FAILED"]),
  requestedByEmail: z.string().email().nullable(),
  createdAt: z.string().datetime(),
  startedAt: z.string().datetime().nullable(),
  finishedAt: z.string().datetime().nullable(),
  errorMessage: z.string().nullable()
});

export type AdminReindexJobSummary = z.infer<
  typeof adminReindexJobSummarySchema
>;

export const adminSearchSyncLogSchema = z.object({
  logId: z.string(),
  listingId: z.string().nullable(),
  documentId: z.string().nullable(),
  status: z.enum(["PENDING", "INDEXED", "FAILED"]),
  message: z.string().nullable(),
  createdAt: z.string().datetime()
});

export type AdminSearchSyncLog = z.infer<
  typeof adminSearchSyncLogSchema
>;

export const adminAuditLogSummarySchema = z.object({
  auditLogId: z.string(),
  actorEmail: z.string().email().nullable(),
  entityType: z.string(),
  entityId: z.string(),
  action: z.string(),
  createdAt: z.string().datetime()
});

export type AdminAuditLogSummary = z.infer<
  typeof adminAuditLogSummarySchema
>;

export const adminWebhookDeliverySummarySchema = z.object({
  webhookDeliveryId: z.string(),
  provider: z.string(),
  externalEventId: z.string(),
  status: z.enum(["RECEIVED", "PROCESSED", "DUPLICATE", "FAILED"]),
  receivedAt: z.string().datetime(),
  processedAt: z.string().datetime().nullable()
});

export type AdminWebhookDeliverySummary = z.infer<
  typeof adminWebhookDeliverySummarySchema
>;

export const adminOperationsOverviewSchema = z.object({
  metrics: z.object({
    searchDocuments: z.number().int().nonnegative(),
    reindexJobs: z.number().int().nonnegative(),
    pendingSyncLogs: z.number().int().nonnegative(),
    failedSyncLogs: z.number().int().nonnegative(),
    auditLogs: z.number().int().nonnegative(),
    webhookDeliveries: z.number().int().nonnegative(),
    activeReservations: z.number().int().nonnegative()
  }),
  recentReindexJobs: z.array(adminReindexJobSummarySchema),
  recentSyncLogs: z.array(adminSearchSyncLogSchema),
  recentAuditLogs: z.array(adminAuditLogSummarySchema),
  recentWebhookDeliveries: z.array(adminWebhookDeliverySummarySchema)
});

export type AdminOperationsOverview = z.infer<
  typeof adminOperationsOverviewSchema
>;

export const triggerReindexRequestSchema = z.object({
  scope: z.string().trim().min(3).max(80).default("catalog-full")
});

export type TriggerReindexRequest = z.infer<
  typeof triggerReindexRequestSchema
>;

export const triggerReindexResponseSchema = z.object({
  jobId: z.string(),
  scope: z.string(),
  processedDocuments: z.number().int().nonnegative(),
  indexedDocuments: z.number().int().nonnegative(),
  status: z.enum(["SUCCEEDED", "FAILED"]),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime(),
  errorMessage: z.string().nullable()
});

export type TriggerReindexResponse = z.infer<
  typeof triggerReindexResponseSchema
>;

export const sellerDashboardSchema = z.object({
  generatedAt: z.string().datetime(),
  seller: z.object({
    sellerId: z.string(),
    slug: z.string(),
    displayName: z.string(),
    status: sellerStatusSchema
  }),
  metrics: z.object({
    activeListings: z.number().int().nonnegative(),
    lowStockListings: z.number().int().nonnegative(),
    availableUnits: z.number().int().nonnegative(),
    reservedUnits: z.number().int().nonnegative(),
    openOrders: z.number().int().nonnegative(),
    totalOrders: z.number().int().nonnegative()
  }),
  notes: z.array(z.string())
});

export type SellerDashboard = z.infer<typeof sellerDashboardSchema>;

export const sellerCreationCategorySchema = z.object({
  categoryId: z.string(),
  name: z.string(),
  slug: z.string(),
  label: z.string()
});

export type SellerCreationCategory = z.infer<
  typeof sellerCreationCategorySchema
>;

export const sellerProductCreationOptionsSchema = z.object({
  categories: z.array(sellerCreationCategorySchema)
});

export type SellerProductCreationOptions = z.infer<
  typeof sellerProductCreationOptionsSchema
>;

export const sellerProductOwnershipSchema = z.enum(["PLATFORM", "SELLER"]);

export type SellerProductOwnership = z.infer<
  typeof sellerProductOwnershipSchema
>;

export const sellerListingCatalogOptionSchema = z.object({
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  image: mediaAssetSchema.nullable(),
  sellerListingCount: z.number().int().nonnegative(),
  variants: z.array(
    z.object({
      variantId: z.string(),
      title: z.string(),
      isDefault: z.boolean()
    })
  )
});

export type SellerListingCatalogOption = z.infer<
  typeof sellerListingCatalogOptionSchema
>;

export const sellerListingSummarySchema = z.object({
  listingId: z.string(),
  inventoryItemId: z.string(),
  productId: z.string(),
  slug: z.string(),
  title: z.string(),
  productDescription: z.string(),
  categoryId: z.string().nullable(),
  categoryName: z.string().nullable(),
  brandName: z.string().nullable(),
  variantTitle: z.string().nullable(),
  sellerSku: z.string(),
  status: productStatusSchema,
  isActive: z.boolean(),
  leadTimeDays: z.number().int().positive(),
  canEditProductContent: z.boolean(),
  productOwnership: sellerProductOwnershipSchema,
  price: moneySchema.nullable(),
  compareAtPrice: moneySchema.nullable(),
  inventory: z.object({
    onHand: z.number().int().nonnegative(),
    reserved: z.number().int().nonnegative(),
    safetyStock: z.number().int().nonnegative(),
    availableQuantity: z.number().int().nonnegative()
  }),
  image: mediaAssetSchema.nullable(),
  updatedAt: z.string().datetime()
});

export type SellerListingSummary = z.infer<
  typeof sellerListingSummarySchema
>;

export const updateSellerInventoryRequestSchema = z.object({
  onHand: z.number().int().nonnegative(),
  safetyStock: z.number().int().nonnegative(),
  leadTimeDays: z.number().int().min(1).max(30),
  note: z.string().trim().max(240).nullable().optional()
});

export type UpdateSellerInventoryRequest = z.infer<
  typeof updateSellerInventoryRequestSchema
>;

export const createSellerCatalogProductRequestSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(16).max(4_000),
    categoryId: z.string().cuid(),
    brandName: z.string().trim().max(80).nullable().optional(),
    variantTitle: z.string().trim().max(120).nullable().optional(),
    sellerSku: z.string().trim().min(3).max(120),
    leadTimeDays: z.number().int().min(1).max(30),
    priceAmount: z.number().int().positive(),
    compareAtAmount: z.number().int().positive().nullable().optional(),
    onHand: z.number().int().nonnegative(),
    safetyStock: z.number().int().nonnegative(),
    isActive: z.boolean().default(true),
    imageUrl: z.string().url().nullable().optional(),
    imageAlt: z.string().trim().max(160).nullable().optional(),
    note: z.string().trim().max(240).nullable().optional()
  })
  .superRefine((value, context) => {
    if (
      value.compareAtAmount !== null &&
      value.compareAtAmount !== undefined &&
      value.compareAtAmount < value.priceAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["compareAtAmount"],
        message:
          "Compare-at amount must be greater than or equal to the current price."
      });
    }
  });

export type CreateSellerCatalogProductRequest = z.infer<
  typeof createSellerCatalogProductRequestSchema
>;

export const updateSellerCatalogProductRequestSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().min(16).max(4_000),
  categoryId: z.string().cuid(),
  brandName: z.string().trim().max(80).nullable().optional(),
  imageUrl: z.string().url().nullable().optional(),
  imageAlt: z.string().trim().max(160).nullable().optional(),
  note: z.string().trim().max(240).nullable().optional()
});

export type UpdateSellerCatalogProductRequest = z.infer<
  typeof updateSellerCatalogProductRequestSchema
>;

export const createSellerListingRequestSchema = z
  .object({
    productId: z.string().cuid(),
    variantId: z.string().cuid().nullable().optional(),
    sellerSku: z.string().trim().min(3).max(120),
    leadTimeDays: z.number().int().min(1).max(30),
    priceAmount: z.number().int().positive(),
    compareAtAmount: z.number().int().positive().nullable().optional(),
    onHand: z.number().int().nonnegative(),
    safetyStock: z.number().int().nonnegative(),
    isActive: z.boolean().default(true),
    note: z.string().trim().max(240).nullable().optional()
  })
  .superRefine((value, context) => {
    if (
      value.compareAtAmount !== null &&
      value.compareAtAmount !== undefined &&
      value.compareAtAmount < value.priceAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["compareAtAmount"],
        message:
          "Compare-at amount must be greater than or equal to the current price."
      });
    }
  });

export type CreateSellerListingRequest = z.infer<
  typeof createSellerListingRequestSchema
>;

export const updateSellerListingCommercialRequestSchema = z
  .object({
    priceAmount: z.number().int().positive(),
    compareAtAmount: z.number().int().positive().nullable().optional(),
    isActive: z.boolean().default(true),
    note: z.string().trim().max(240).nullable().optional()
  })
  .superRefine((value, context) => {
    if (
      value.compareAtAmount !== null &&
      value.compareAtAmount !== undefined &&
      value.compareAtAmount < value.priceAmount
    ) {
      context.addIssue({
        code: "custom",
        path: ["compareAtAmount"],
        message:
          "Compare-at amount must be greater than or equal to the current price."
      });
    }
  });

export type UpdateSellerListingCommercialRequest = z.infer<
  typeof updateSellerListingCommercialRequestSchema
>;

export const sellerOrderCustomerSchema = z.object({
  label: z.string(),
  email: z.string().email().nullable()
});

export type SellerOrderCustomer = z.infer<
  typeof sellerOrderCustomerSchema
>;

export const sellerOrderSummarySchema = z.object({
  orderId: z.string(),
  number: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  customer: sellerOrderCustomerSchema,
  itemCount: z.number().int().nonnegative(),
  subtotal: moneySchema,
  discountTotal: moneySchema,
  total: moneySchema,
  createdAt: z.string().datetime(),
  placedAt: z.string().datetime().nullable()
});

export type SellerOrderSummary = z.infer<
  typeof sellerOrderSummarySchema
>;

export const sellerOrderDetailSchema = sellerOrderSummarySchema.extend({
  customerContact: checkoutContactSummarySchema.nullable(),
  deliveryAddress: checkoutAddressSummarySchema.nullable(),
  canManageStatus: z.boolean(),
  availableNextStatuses: z.array(orderStatusSchema),
  statusManagementNote: z.string().nullable(),
  items: z.array(orderItemDetailSchema),
  statusHistory: z.array(orderStatusHistoryEntrySchema),
  refunds: z.array(refundSummarySchema)
});

export type SellerOrderDetail = z.infer<typeof sellerOrderDetailSchema>;

export const updateSellerOrderStatusRequestSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(240).nullable().optional()
});

export type UpdateSellerOrderStatusRequest = z.infer<
  typeof updateSellerOrderStatusRequestSchema
>;
