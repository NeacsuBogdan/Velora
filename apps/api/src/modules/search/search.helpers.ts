import { Prisma, type Price } from "@prisma/client";
import {
  availabilityFilterSchema,
  catalogFiltersSchema,
  catalogSearchResponseSchema,
  catalogSortSchema,
  type CatalogSearchResponse,
  type CatalogSort,
  productListItemSchema,
  type ProductListItem
} from "@velora/contracts";
import { z } from "zod";

export const searchProjectionListingInclude =
  Prisma.validator<Prisma.SellerProductListingDefaultArgs>()({
    include: {
      seller: true,
      variant: true,
      inventoryItem: true,
      prices: true,
      product: {
        include: {
          brand: true,
          category: {
            include: {
              parent: true
            }
          },
          media: {
            orderBy: {
              sortOrder: "asc"
            }
          },
          attributes: {
            orderBy: {
              createdAt: "asc"
            }
          }
        }
      }
    }
  });

export type SearchProjectionListing = Prisma.SellerProductListingGetPayload<
  typeof searchProjectionListingInclude
>;

const arrayQueryValueSchema = z.preprocess((value) => {
  if (Array.isArray(value)) {
    return value
      .flatMap((entry) => String(entry).split(","))
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
  }

  return [];
}, z.array(z.string().min(1)).max(12));

const optionalQueryStringSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}, z.string().max(120).optional());

const optionalIntegerSchema = z.preprocess((value) => {
  if (typeof value === "string" && value.trim().length > 0) {
    return Number(value);
  }

  if (typeof value === "number") {
    return value;
  }

  return undefined;
}, z.number().int().nonnegative().max(1_000_000).optional());

const searchQuerySchema = z.object({
  q: optionalQueryStringSchema,
  category: optionalQueryStringSchema,
  brand: arrayQueryValueSchema.default([]),
  minPrice: optionalIntegerSchema,
  maxPrice: optionalIntegerSchema,
  availability: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? value
        : "all",
    availabilityFilterSchema
  ),
  sort: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? value
        : "relevance",
    catalogSortSchema
  ),
  page: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : value,
    z.number().int().positive().default(1)
  ),
  pageSize: z.preprocess(
    (value) =>
      typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : value,
    z.number().int().min(1).max(24).default(12)
  )
});

export interface NormalizedSearchQuery {
  appliedFilters: z.infer<typeof catalogFiltersSchema>;
  page: number;
  pageSize: number;
}

export interface SearchProjectionDocument extends ProductListItem {
  brandFacet: string | null;
  categoryFacet: string | null;
  categoryPathSlugs: string[];
  availabilityKey: "in_stock" | "out_of_stock";
  createdAt: string;
  searchText: string;
}

export const searchProjectionDocumentSchema = productListItemSchema.extend({
  brandFacet: z.string().nullable(),
  categoryFacet: z.string().nullable(),
  categoryPathSlugs: z.array(z.string()),
  availabilityKey: z.enum(["in_stock", "out_of_stock"]),
  createdAt: z.string().datetime(),
  searchText: z.string()
});

const sortOptions = [
  {
    value: "relevance",
    label: "Relevance"
  },
  {
    value: "newest",
    label: "Newest"
  },
  {
    value: "price_asc",
    label: "Price: low to high"
  },
  {
    value: "price_desc",
    label: "Price: high to low"
  }
] as const;

export function getCatalogSortOptions(): CatalogSearchResponse["availableSorts"] {
  return [...sortOptions];
}

export function normalizeSearchQuery(
  input: Record<string, unknown>
): NormalizedSearchQuery {
  const parsed = searchQuerySchema.parse(input);

  const minPrice = parsed.minPrice ?? null;
  const maxPrice =
    parsed.maxPrice !== undefined &&
    parsed.minPrice !== undefined &&
    parsed.maxPrice < parsed.minPrice
      ? parsed.minPrice
      : (parsed.maxPrice ?? null);

  return {
    appliedFilters: catalogFiltersSchema.parse({
      query: parsed.q ?? "",
      category: parsed.category ?? null,
      brands: parsed.brand,
      minPrice,
      maxPrice,
      availability: parsed.availability,
      sort: parsed.sort
    }),
    page: parsed.page,
    pageSize: parsed.pageSize
  };
}

function resolveActivePrice(prices: Price[], now: Date): Price | null {
  const activePrices = prices
    .filter((price) => {
      const startsAtValid = price.startsAt ? price.startsAt <= now : true;
      const endsAtValid = price.endsAt ? price.endsAt >= now : true;
      return startsAtValid && endsAtValid;
    })
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime());

  return activePrices[0] ?? null;
}

function calculateDiscountPercentage(
  amount: number,
  compareAtAmount: number | null | undefined
): number | null {
  if (!compareAtAmount || compareAtAmount <= amount) {
    return null;
  }

  return Math.round(((compareAtAmount - amount) / compareAtAmount) * 100);
}

export function calculateAvailableQuantity(
  inventory:
    | {
        onHand: number;
        reserved: number;
        safetyStock: number;
      }
    | null
    | undefined
): number {
  if (!inventory) {
    return 0;
  }

  return Math.max(inventory.onHand - inventory.reserved - inventory.safetyStock, 0);
}

function toFacetValue(slug: string | null | undefined, name: string | null | undefined) {
  if (!slug || !name) {
    return null;
  }

  return `${slug}|${name}`;
}

export function buildSearchDocument(
  listing: SearchProjectionListing,
  now = new Date()
): SearchProjectionDocument {
  const price = resolveActivePrice(listing.prices, now);
  const currentAmount = price?.amount ?? 0;
  const currentCurrency = price?.currency ?? "RON";
  const compareAtAmount = price?.compareAtAmount ?? null;
  const availableQuantity = calculateAvailableQuantity(listing.inventoryItem);
  const categoryPath = listing.product.category
    ? [
        ...(listing.product.category.parent
          ? [
              {
                slug: listing.product.category.parent.slug,
                name: listing.product.category.parent.name
              }
            ]
          : []),
        {
          slug: listing.product.category.slug,
          name: listing.product.category.name
        }
      ]
    : [];
  const highlights = [
    listing.variant?.title ?? null,
    ...listing.product.attributes
      .slice(0, 2)
      .map((attribute) => `${attribute.name}: ${attribute.value}`)
  ].filter((value): value is string => Boolean(value));

  const item = productListItemSchema.parse({
    listingId: listing.id,
    productId: listing.product.id,
    slug: listing.product.slug,
    title: listing.product.title,
    subtitle: listing.variant?.title ?? null,
    description: listing.product.description,
    seller: {
      slug: listing.seller.slug,
      name: listing.seller.displayName
    },
    brand: listing.product.brand
      ? {
          slug: listing.product.brand.slug,
          name: listing.product.brand.name
        }
      : null,
    category: listing.product.category
      ? {
          slug: listing.product.category.slug,
          name: listing.product.category.name,
          path: categoryPath
        }
      : null,
    pricing: {
      current: {
        amount: currentAmount,
        currency: currentCurrency
      },
      compareAt: compareAtAmount
        ? {
            amount: compareAtAmount,
            currency: currentCurrency
          }
        : null,
      discountPercentage: calculateDiscountPercentage(
        currentAmount,
        compareAtAmount
      )
    },
    availability: {
      inStock: availableQuantity > 0,
      availableQuantity,
      leadTimeDays: listing.leadTimeDays
    },
    image: listing.product.media[0]
      ? {
          url: listing.product.media[0].url,
          altText: listing.product.media[0].altText
        }
      : null,
    highlights
  });

  return {
    ...item,
    brandFacet: toFacetValue(item.brand?.slug, item.brand?.name),
    categoryFacet: toFacetValue(item.category?.slug, item.category?.name),
    categoryPathSlugs: item.category?.path.map((entry) => entry.slug) ?? [],
    availabilityKey: item.availability.inStock ? "in_stock" : "out_of_stock",
    createdAt: listing.product.createdAt.toISOString(),
    searchText: [
      item.title,
      item.subtitle,
      item.description,
      item.brand?.name,
      item.seller.name,
      item.category?.name,
      ...item.highlights
    ]
      .filter(Boolean)
      .join(" ")
  };
}

export function splitFacetValue(value: string) {
  const [slug, ...nameParts] = value.split("|");

  return {
    slug: slug ?? "",
    name: nameParts.join("|")
  };
}

function matchesTextQuery(document: SearchProjectionDocument, query: string) {
  const lowerHaystack = document.searchText.toLowerCase();
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);

  return terms.every((term) => lowerHaystack.includes(term));
}

function calculateFallbackScore(
  document: SearchProjectionDocument,
  query: string
): number {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
  const title = document.title.toLowerCase();
  const subtitle = document.subtitle?.toLowerCase() ?? "";
  const description = document.description.toLowerCase();

  return terms.reduce((score, term) => {
    let nextScore = score;

    if (title.includes(term)) {
      nextScore += 6;
    }

    if (subtitle.includes(term)) {
      nextScore += 4;
    }

    if (description.includes(term)) {
      nextScore += 2;
    }

    if (document.searchText.toLowerCase().includes(term)) {
      nextScore += 1;
    }

    return nextScore;
  }, 0);
}

function sortDocuments(
  documents: SearchProjectionDocument[],
  sort: CatalogSort,
  query: string
) {
  return [...documents].sort((left, right) => {
    if (sort === "price_asc") {
      return left.pricing.current.amount - right.pricing.current.amount;
    }

    if (sort === "price_desc") {
      return right.pricing.current.amount - left.pricing.current.amount;
    }

    if (sort === "newest") {
      return (
        new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
      );
    }

    const scoreDelta =
      calculateFallbackScore(right, query) - calculateFallbackScore(left, query);

    if (scoreDelta !== 0) {
      return scoreDelta;
    }

    return left.pricing.current.amount - right.pricing.current.amount;
  });
}

function buildFacetOptions(
  documents: SearchProjectionDocument[],
  selectedValues: string[],
  getFacetValue: (document: SearchProjectionDocument) => string | null
) {
  const buckets = new Map<string, { label: string; count: number }>();

  for (const document of documents) {
    const rawFacet = getFacetValue(document);

    if (!rawFacet) {
      continue;
    }

    const parsed = splitFacetValue(rawFacet);
    const bucket = buckets.get(parsed.slug);

    buckets.set(parsed.slug, {
      label: parsed.name,
      count: (bucket?.count ?? 0) + 1
    });
  }

  return [...buckets.entries()]
    .map(([value, bucket]) => ({
      value,
      label: bucket.label,
      count: bucket.count,
      selected: selectedValues.includes(value)
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

function buildAvailabilityFacetOptions(
  documents: SearchProjectionDocument[],
  selectedAvailability: z.infer<typeof availabilityFilterSchema>
) {
  const inStockCount = documents.filter(
    (document) => document.availability.inStock
  ).length;

  return [
    {
      value: "in_stock",
      label: "In stock",
      count: inStockCount,
      selected: selectedAvailability === "in_stock"
    }
  ];
}

function buildPriceRange(documents: SearchProjectionDocument[]) {
  if (documents.length === 0) {
    return {
      min: null,
      max: null
    };
  }

  const prices = documents.map((document) =>
    Math.round(document.pricing.current.amount / 100)
  );

  return {
    min: Math.min(...prices),
    max: Math.max(...prices)
  };
}

export function filterSearchDocuments(
  documents: SearchProjectionDocument[],
  query: NormalizedSearchQuery
) {
  return documents.filter((document) => {
    if (
      query.appliedFilters.query.length > 0 &&
      !matchesTextQuery(document, query.appliedFilters.query)
    ) {
      return false;
    }

    if (
      query.appliedFilters.category &&
      !document.categoryPathSlugs.includes(query.appliedFilters.category)
    ) {
      return false;
    }

    if (
      query.appliedFilters.brands.length > 0 &&
      !query.appliedFilters.brands.includes(document.brand?.slug ?? "")
    ) {
      return false;
    }

    const majorUnitPrice = Math.round(document.pricing.current.amount / 100);

    if (
      query.appliedFilters.minPrice !== null &&
      majorUnitPrice < query.appliedFilters.minPrice
    ) {
      return false;
    }

    if (
      query.appliedFilters.maxPrice !== null &&
      majorUnitPrice > query.appliedFilters.maxPrice
    ) {
      return false;
    }

    if (
      query.appliedFilters.availability === "in_stock" &&
      !document.availability.inStock
    ) {
      return false;
    }

    return true;
  });
}

export function buildCatalogSearchResponse(
  source: "opensearch" | "fallback",
  documents: SearchProjectionDocument[],
  query: NormalizedSearchQuery
): CatalogSearchResponse {
  const filteredDocuments = filterSearchDocuments(documents, query);
  const sortedDocuments = sortDocuments(
    filteredDocuments,
    query.appliedFilters.sort,
    query.appliedFilters.query
  );
  const totalItems = sortedDocuments.length;
  const totalPages =
    totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);
  const startIndex = (query.page - 1) * query.pageSize;
  const pagedItems = sortedDocuments
    .slice(startIndex, startIndex + query.pageSize)
    .map((document) => productListItemSchema.parse(document));

  return catalogSearchResponseSchema.parse({
    source,
    query: query.appliedFilters.query,
    availableSorts: getCatalogSortOptions(),
    appliedFilters: query.appliedFilters,
    pagination: {
      page: query.page,
      pageSize: query.pageSize,
      totalItems,
      totalPages
    },
    items: pagedItems,
    facets: {
      brands: buildFacetOptions(
        filteredDocuments,
        query.appliedFilters.brands,
        (document) => document.brandFacet
      ),
      categories: buildFacetOptions(
        filteredDocuments,
        query.appliedFilters.category
          ? [query.appliedFilters.category]
          : [],
        (document) => document.categoryFacet
      ),
      availability: buildAvailabilityFacetOptions(
        filteredDocuments,
        query.appliedFilters.availability
      ),
      priceRange: buildPriceRange(filteredDocuments)
    }
  });
}
