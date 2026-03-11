import { describe, expect, it } from "vitest";

import {
  buildCatalogSearchResponse,
  buildSearchDocument,
  normalizeSearchQuery,
  type SearchProjectionDocument,
  type SearchProjectionListing
} from "./search.helpers";

function createDocument(
  overrides: Partial<SearchProjectionDocument>
): SearchProjectionDocument {
  return {
    listingId: "listing-1",
    productId: "product-1",
    slug: "nordwave-edge-s",
    title: "NordWave Edge S",
    subtitle: "Azure 128 GB",
    description: "Balanced flagship phone with fast charging.",
    seller: {
      slug: "north-star-electronics",
      name: "North Star Electronics"
    },
    brand: {
      slug: "nordwave",
      name: "NordWave"
    },
    category: {
      slug: "phones",
      name: "Phones",
      path: [
        {
          slug: "electronics",
          name: "Electronics"
        },
        {
          slug: "phones",
          name: "Phones"
        }
      ]
    },
    pricing: {
      current: {
        amount: 329900,
        currency: "RON"
      },
      compareAt: {
        amount: 359900,
        currency: "RON"
      },
      discountPercentage: 8
    },
    availability: {
      inStock: true,
      availableQuantity: 12,
      leadTimeDays: 1
    },
    image: {
      url: "https://placehold.co/800x800/png?text=NordWave+Edge+S",
      altText: "NordWave Edge S hero"
    },
    highlights: ["6.1 inch OLED", "50 MP dual camera"],
    brandFacet: "nordwave|NordWave",
    categoryFacet: "phones|Phones",
    categoryPathSlugs: ["electronics", "phones"],
    availabilityKey: "in_stock",
    createdAt: "2026-03-10T08:00:00.000Z",
    searchText: "NordWave Edge S Azure 128 GB Balanced flagship phone",
    ...overrides
  };
}

describe("search helpers", () => {
  it("normalizes query parameters into catalog filters", () => {
    const normalized = normalizeSearchQuery({
      q: "  laptop  ",
      brand: ["vanta", "astra-mobile"],
      minPrice: "2500",
      maxPrice: "5000",
      availability: "in_stock",
      sort: "price_desc",
      page: "2",
      pageSize: "6"
    });

    expect(normalized.appliedFilters).toEqual({
      query: "laptop",
      category: null,
      brands: ["vanta", "astra-mobile"],
      minPrice: 2500,
      maxPrice: 5000,
      availability: "in_stock",
      sort: "price_desc"
    });
    expect(normalized.page).toBe(2);
    expect(normalized.pageSize).toBe(6);
  });

  it("maps a listing into a search projection document", () => {
    const listing = {
      id: "listing-1",
      sellerId: "seller-1",
      productId: "product-1",
      variantId: "variant-1",
      sellerSku: "seed-north-star-electronics-nordwave-edge-s",
      status: "ACTIVE",
      isActive: true,
      leadTimeDays: 1,
      createdAt: new Date("2026-03-10T08:00:00.000Z"),
      updatedAt: new Date("2026-03-10T08:00:00.000Z"),
      seller: {
        id: "seller-1",
        slug: "north-star-electronics",
        displayName: "North Star Electronics",
        legalName: "North Star Electronics SRL",
        contactEmail: "seller@velora.local",
        status: "ACTIVE",
        ownerUserId: null,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      variant: {
        id: "variant-1",
        sku: "VEL-000002",
        title: "Azure 128 GB",
        attributes: {
          color: "Azure",
          storage: "128 GB"
        },
        isDefault: true,
        productId: "product-1",
        createdAt: new Date(),
        updatedAt: new Date()
      },
      inventoryItem: {
        id: "inventory-1",
        listingId: "listing-1",
        onHand: 15,
        reserved: 2,
        safetyStock: 1,
        updatedAt: new Date()
      },
      prices: [
        {
          id: "price-1",
          listingId: "listing-1",
          amount: 329900,
          currency: "RON",
          compareAtAmount: 359900,
          startsAt: null,
          endsAt: null,
          createdAt: new Date("2026-03-10T08:00:00.000Z")
        }
      ],
      product: {
        id: "product-1",
        slug: "nordwave-edge-s",
        title: "NordWave Edge S",
        description: "Balanced flagship phone with fast charging.",
        status: "ACTIVE",
        brandId: "brand-1",
        categoryId: "category-2",
        createdAt: new Date("2026-03-10T08:00:00.000Z"),
        updatedAt: new Date("2026-03-10T08:00:00.000Z"),
        brand: {
          id: "brand-1",
          slug: "nordwave",
          name: "NordWave",
          createdAt: new Date(),
          updatedAt: new Date()
        },
        category: {
          id: "category-2",
          slug: "phones",
          name: "Phones",
          description: "Smartphones and companion devices.",
          parentId: "category-1",
          sortOrder: 1,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: {
            id: "category-1",
            slug: "electronics",
            name: "Electronics",
            description: "Consumer electronics and connected devices.",
            parentId: null,
            sortOrder: 1,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
          }
        },
        media: [
          {
            id: "media-1",
            productId: "product-1",
            storageKey: "catalog/nordwave-edge-s/hero.png",
            url: "https://placehold.co/800x800/png?text=NordWave+Edge+S",
            altText: "NordWave Edge S hero",
            kind: "IMAGE",
            sortOrder: 1,
            createdAt: new Date()
          }
        ],
        attributes: [
          {
            id: "attribute-1",
            productId: "product-1",
            name: "Display",
            value: "6.1 inch OLED",
            createdAt: new Date()
          },
          {
            id: "attribute-2",
            productId: "product-1",
            name: "Camera",
            value: "50 MP dual camera",
            createdAt: new Date()
          }
        ]
      }
    } as unknown as SearchProjectionListing;

    const document = buildSearchDocument(listing);

    expect(document.availability.availableQuantity).toBe(12);
    expect(document.pricing.discountPercentage).toBe(8);
    expect(document.categoryPathSlugs).toEqual(["electronics", "phones"]);
  });

  it("sorts and paginates projected documents for fallback search", () => {
    const response = buildCatalogSearchResponse(
      "fallback",
      [
        createDocument({}),
        createDocument({
          listingId: "listing-2",
          productId: "product-2",
          slug: "astra-flex-13",
          title: "Astra Flex 13",
          description: "Convertible ultrabook for note taking.",
          brand: {
            slug: "astra-mobile",
            name: "Astra Mobile"
          },
          brandFacet: "astra-mobile|Astra Mobile",
          category: {
            slug: "laptops",
            name: "Laptops",
            path: [
              {
                slug: "electronics",
                name: "Electronics"
              },
              {
                slug: "laptops",
                name: "Laptops"
              }
            ]
          },
          categoryFacet: "laptops|Laptops",
          categoryPathSlugs: ["electronics", "laptops"],
          pricing: {
            current: {
              amount: 389900,
              currency: "RON"
            },
            compareAt: {
              amount: 419900,
              currency: "RON"
            },
            discountPercentage: 7
          },
          searchText: "Astra Flex 13 convertible ultrabook"
        })
      ],
      normalizeSearchQuery({
        sort: "price_desc",
        pageSize: "1"
      })
    );

    expect(response.items).toHaveLength(1);
    expect(response.pagination.totalItems).toBe(2);
  });
});
