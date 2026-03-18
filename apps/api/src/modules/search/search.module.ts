import { Module } from "@nestjs/common";

import { DatabaseModule } from "../database/database.module";
import { MerchandisingPricingService } from "./merchandising-pricing.service";
import { SearchController } from "./search.controller";
import { OpenSearchService } from "./opensearch.service";
import { SearchProjectionService, SearchService } from "./search.service";

@Module({
  imports: [DatabaseModule],
  controllers: [SearchController],
  providers: [
    OpenSearchService,
    SearchProjectionService,
    SearchService,
    MerchandisingPricingService
  ],
  exports: [OpenSearchService, SearchProjectionService, MerchandisingPricingService]
})
export class SearchModule {}
