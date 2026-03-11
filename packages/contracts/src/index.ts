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
  idempotencyKey: z.string().min(8).max(120).optional()
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
  status: checkoutStatusSchema,
  amount: moneySchema,
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
