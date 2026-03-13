import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import { type CatalogSearchResponse } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import { PlatformCacheService } from "../platform-cache/platform-cache.service";
import { OpenSearchService } from "./opensearch.service";
import {
  type SearchProjectionDocument,
  buildCatalogSearchResponse,
  buildSearchDocument,
  normalizeSearchQuery,
  searchProjectionDocumentSchema,
  searchProjectionListingInclude
} from "./search.helpers";

@Injectable()
export class SearchProjectionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cacheService: PlatformCacheService
  ) {}

  private readonly projectionCacheKey = "search:projection:documents";

  private async findProjectionListings(where?: Prisma.SellerProductListingWhereInput) {
    return this.prisma.sellerProductListing.findMany({
      where: {
        isActive: true,
        status: "ACTIVE",
        product: {
          status: "ACTIVE"
        },
        ...where
      },
      include: searchProjectionListingInclude.include
    });
  }

  async collectDocuments() {
    const listings = await this.findProjectionListings();

    return listings.map((listing) => buildSearchDocument(listing));
  }

  async collectDocumentsByListingIds(listingIds: string[]) {
    if (listingIds.length === 0) {
      return [];
    }

    const listings = await this.findProjectionListings({
      id: {
        in: listingIds
      }
    });

    return listings.map((listing) => buildSearchDocument(listing));
  }

  async getProjectionDocuments() {
    const cached = await this.cacheService.get<SearchProjectionDocument[]>(
      this.projectionCacheKey
    );

    if (cached) {
      return cached;
    }

    const projectionRecords = await this.prisma.searchDocument.findMany({
      select: {
        payload: true
      }
    });

    if (projectionRecords.length > 0) {
      const documents = projectionRecords.map((record) =>
        searchProjectionDocumentSchema.parse(record.payload)
      );

      await this.cacheService.set(this.projectionCacheKey, documents, 30);
      return documents;
    }

    const documents = await this.collectDocuments();

    if (documents.length > 0) {
      await this.syncProjectionRecords(documents);
    }

    return documents;
  }

  async syncProjectionRecords(documents: SearchProjectionDocument[]) {
    for (const document of documents) {
      await this.prisma.searchDocument.upsert({
        where: {
          listingId: document.listingId
        },
        update: {
          documentId: `listing-${document.listingId}`,
          payload: document as unknown as Prisma.InputJsonValue,
          syncedAt: new Date()
        },
        create: {
          listingId: document.listingId,
          documentId: `listing-${document.listingId}`,
          payload: document as unknown as Prisma.InputJsonValue,
          syncedAt: new Date()
        }
      });
    }

    await this.cacheService.deleteByPrefix([
      "search:projection:",
      "search:query:"
    ]);
  }

  async removeProjectionRecords(listingIds: string[]) {
    if (listingIds.length === 0) {
      return 0;
    }

    const result = await this.prisma.searchDocument.deleteMany({
      where: {
        listingId: {
          in: listingIds
        }
      }
    });

    await this.cacheService.deleteByPrefix([
      "search:projection:",
      "search:query:"
    ]);

    return result.count;
  }
}

@Injectable()
export class SearchService {
  constructor(
    private readonly projectionService: SearchProjectionService,
    private readonly openSearchService: OpenSearchService,
    private readonly cacheService: PlatformCacheService,
    private readonly configService: ConfigService
  ) {}

  async searchProducts(rawQuery: Record<string, unknown>): Promise<CatalogSearchResponse> {
    const query = normalizeSearchQuery(rawQuery);
    const queryCacheKey = `search:query:${Buffer.from(JSON.stringify(query)).toString("base64url")}`;

    return this.cacheService.remember(
      queryCacheKey,
      this.configService.get<number>("CACHE_TTL_SEARCH_SECONDS") ?? 30,
      async () => {
        const documents = await this.projectionService.getProjectionDocuments();
        const openSearchResponse = await this.openSearchService.searchDocuments(
          query,
          documents
        );

        if (openSearchResponse) {
          return openSearchResponse;
        }

        return buildCatalogSearchResponse("fallback", documents, query);
      }
    );
  }
}
