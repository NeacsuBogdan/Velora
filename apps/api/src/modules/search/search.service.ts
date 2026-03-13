import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { type CatalogSearchResponse } from "@velora/contracts";

import { PrismaService } from "../database/prisma.service";
import { OpenSearchService } from "./opensearch.service";
import {
  type SearchProjectionDocument,
  buildCatalogSearchResponse,
  buildSearchDocument,
  normalizeSearchQuery,
  searchProjectionListingInclude
} from "./search.helpers";

@Injectable()
export class SearchProjectionService {
  constructor(private readonly prisma: PrismaService) {}

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

    return result.count;
  }
}

@Injectable()
export class SearchService {
  constructor(
    private readonly projectionService: SearchProjectionService,
    private readonly openSearchService: OpenSearchService
  ) {}

  async searchProducts(rawQuery: Record<string, unknown>): Promise<CatalogSearchResponse> {
    const query = normalizeSearchQuery(rawQuery);
    const documents = await this.projectionService.collectDocuments();
    const openSearchResponse = await this.openSearchService.searchDocuments(
      query,
      documents
    );

    if (openSearchResponse) {
      return openSearchResponse;
    }

    return buildCatalogSearchResponse("fallback", documents, query);
  }
}
