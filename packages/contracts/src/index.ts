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
