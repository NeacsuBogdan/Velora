import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Client } from "@opensearch-project/opensearch";
import { catalogSearchResponseSchema } from "@velora/contracts";

import {
  getCatalogSortOptions,
  type NormalizedSearchQuery,
  type SearchProjectionDocument,
  splitFacetValue
} from "./search.helpers";

@Injectable()
export class OpenSearchService {
  private readonly logger = new Logger(OpenSearchService.name);
  private readonly client: Client | null;
  private readonly indexName: string;
  private projectionReady = false;

  constructor(private readonly configService: ConfigService) {
    const node = this.configService.get<string>("OPENSEARCH_URL");
    this.indexName =
      this.configService.get<string>("OPENSEARCH_INDEX") ?? "velora_products_v1";
    this.client = node ? new Client({ node }) : null;
  }

  private unwrap<T>(response: T | { body: T }): T {
    if (
      response &&
      typeof response === "object" &&
      "body" in response &&
      response.body !== undefined
    ) {
      return response.body;
    }

    return response as T;
  }

  private buildSearchBody(query: NormalizedSearchQuery) {
    const filters: Array<Record<string, unknown>> = [];

    if (query.appliedFilters.category) {
      filters.push({
        term: {
          categoryPathSlugs: query.appliedFilters.category
        }
      });
    }

    if (query.appliedFilters.brands.length > 0) {
      filters.push({
        terms: {
          "brand.slug": query.appliedFilters.brands
        }
      });
    }

    if (query.appliedFilters.minPrice !== null || query.appliedFilters.maxPrice !== null) {
      filters.push({
        range: {
          "pricing.current.amount": {
            ...(query.appliedFilters.minPrice !== null
              ? { gte: query.appliedFilters.minPrice * 100 }
              : {}),
            ...(query.appliedFilters.maxPrice !== null
              ? { lte: query.appliedFilters.maxPrice * 100 }
              : {})
          }
        }
      });
    }

    if (query.appliedFilters.availability === "in_stock") {
      filters.push({
        term: {
          availabilityKey: "in_stock"
        }
      });
    }

    let sort: Array<Record<string, unknown>>;

    if (query.appliedFilters.sort === "price_asc") {
      sort = [{ "pricing.current.amount": "asc" }];
    } else if (query.appliedFilters.sort === "price_desc") {
      sort = [{ "pricing.current.amount": "desc" }];
    } else if (query.appliedFilters.sort === "newest") {
      sort = [{ createdAt: "desc" }];
    } else if (query.appliedFilters.query.length > 0) {
      sort = [{ _score: "desc" }, { "pricing.current.amount": "asc" }];
    } else {
      sort = [{ createdAt: "desc" }];
    }

    return {
      from: (query.page - 1) * query.pageSize,
      size: query.pageSize,
      query: {
        bool: {
          must:
            query.appliedFilters.query.length > 0
              ? [
                  {
                    multi_match: {
                      query: query.appliedFilters.query,
                      fields: [
                        "title^5",
                        "subtitle^3",
                        "description^2",
                        "brand.name^2",
                        "seller.name^2",
                        "category.name",
                        "highlights",
                        "searchText"
                      ],
                      operator: "and" as const
                    }
                  }
                ]
              : [{ match_all: {} }],
          filter: filters
        }
      },
      aggs: {
        brands: {
          terms: {
            field: "brandFacet",
            size: 12
          }
        },
        categories: {
          terms: {
            field: "categoryFacet",
            size: 12
          }
        },
        availability: {
          terms: {
            field: "availabilityKey",
            size: 2
          }
        },
        priceRange: {
          stats: {
            field: "pricing.current.amount"
          }
        }
      },
      sort
    };
  }

  private async ensureIndex() {
    if (!this.client) {
      return false;
    }

    const exists = this.unwrap(
      await this.client.indices.exists({
        index: this.indexName
      })
    );

    if (exists) {
      return true;
    }

    await this.client.indices.create({
      index: this.indexName,
      body: {
        mappings: {
          properties: {
            listingId: { type: "keyword" },
            productId: { type: "keyword" },
            slug: { type: "keyword" },
            title: {
              type: "text",
              fields: {
                keyword: { type: "keyword" }
              }
            },
            subtitle: { type: "text" },
            description: { type: "text" },
            seller: {
              properties: {
                slug: { type: "keyword" },
                name: {
                  type: "text",
                  fields: {
                    keyword: { type: "keyword" }
                  }
                }
              }
            },
            brand: {
              properties: {
                slug: { type: "keyword" },
                name: {
                  type: "text",
                  fields: {
                    keyword: { type: "keyword" }
                  }
                }
              }
            },
            category: {
              properties: {
                slug: { type: "keyword" },
                name: {
                  type: "text",
                  fields: {
                    keyword: { type: "keyword" }
                  }
                },
                path: {
                  properties: {
                    slug: { type: "keyword" },
                    name: { type: "keyword" }
                  }
                }
              }
            },
            pricing: {
              properties: {
                current: {
                  properties: {
                    amount: { type: "integer" },
                    currency: { type: "keyword" }
                  }
                },
                compareAt: {
                  properties: {
                    amount: { type: "integer" },
                    currency: { type: "keyword" }
                  }
                },
                discountPercentage: { type: "integer" }
              }
            },
            availability: {
              properties: {
                inStock: { type: "boolean" },
                availableQuantity: { type: "integer" },
                leadTimeDays: { type: "integer" }
              }
            },
            image: {
              properties: {
                url: { type: "keyword" },
                altText: { type: "text" }
              }
            },
            highlights: { type: "text" },
            brandFacet: { type: "keyword" },
            categoryFacet: { type: "keyword" },
            categoryPathSlugs: { type: "keyword" },
            availabilityKey: { type: "keyword" },
            createdAt: { type: "date" },
            searchText: { type: "text" }
          }
        }
      }
    });

    return true;
  }

  async syncDocuments(
    documents: SearchProjectionDocument[],
    options?: { force?: boolean }
  ) {
    if (!this.client) {
      return false;
    }

    if (!options?.force && this.projectionReady) {
      return true;
    }

    await this.ensureIndex();

    if (documents.length === 0) {
      this.projectionReady = true;
      return true;
    }

    const body = documents.flatMap((document) => [
      {
        index: {
          _index: this.indexName,
          _id: document.listingId
        }
      },
      document
    ]);

    await this.client.bulk({
      refresh: true,
      body
    });

    this.projectionReady = true;
    return true;
  }

  async searchDocuments(
    query: NormalizedSearchQuery,
    fallbackDocuments: SearchProjectionDocument[]
  ) {
    if (!this.client) {
      return null;
    }

    try {
      await this.syncDocuments(fallbackDocuments);

      const body = this.unwrap(
        await this.client.search({
          index: this.indexName,
          body: this.buildSearchBody(query)
        })
      );

      const hits = ((body.hits as { hits?: Array<{ _source?: unknown }> })?.hits ??
        [])
        .map((hit) => hit._source)
        .filter(Boolean);
      const total = body.hits as { total?: number | { value: number } } | undefined;
      const totalItems =
        typeof total?.total === "number"
          ? total.total
          : total?.total?.value ?? 0;
      const aggregations = body.aggregations as
        | {
            brands?: { buckets?: Array<{ key: string; doc_count: number }> };
            categories?: { buckets?: Array<{ key: string; doc_count: number }> };
            availability?: {
              buckets?: Array<{ key: string; doc_count: number }>;
            };
            priceRange?: {
              min?: number | null;
              max?: number | null;
            };
          }
        | undefined;
      const totalPages =
        totalItems === 0 ? 0 : Math.ceil(totalItems / query.pageSize);

      return catalogSearchResponseSchema.parse({
        source: "opensearch",
        query: query.appliedFilters.query,
        availableSorts: getCatalogSortOptions(),
        appliedFilters: query.appliedFilters,
        pagination: {
          page: query.page,
          pageSize: query.pageSize,
          totalItems,
          totalPages
        },
        items: hits,
        facets: {
          brands:
            aggregations?.brands?.buckets?.map((bucket) => {
              const parsed = splitFacetValue(bucket.key);

              return {
                value: parsed.slug,
                label: parsed.name,
                count: bucket.doc_count,
                selected: query.appliedFilters.brands.includes(parsed.slug)
              };
            }) ?? [],
          categories:
            aggregations?.categories?.buckets?.map((bucket) => {
              const parsed = splitFacetValue(bucket.key);

              return {
                value: parsed.slug,
                label: parsed.name,
                count: bucket.doc_count,
                selected: query.appliedFilters.category === parsed.slug
              };
            }) ?? [],
          availability:
            aggregations?.availability?.buckets?.map((bucket) => ({
              value: bucket.key,
              label: bucket.key === "in_stock" ? "In stock" : "Out of stock",
              count: bucket.doc_count,
              selected: query.appliedFilters.availability === bucket.key
            })) ?? [],
          priceRange: {
            min:
              typeof aggregations?.priceRange?.min === "number"
                ? Math.round(aggregations.priceRange.min / 100)
                : null,
            max:
              typeof aggregations?.priceRange?.max === "number"
                ? Math.round(aggregations.priceRange.max / 100)
                : null
          }
        }
      });
    } catch (error) {
      this.logger.warn(
        `OpenSearch query failed for index ${this.indexName}. Falling back to in-memory search.`,
        error instanceof Error ? error.stack : undefined
      );
      return null;
    }
  }
}
